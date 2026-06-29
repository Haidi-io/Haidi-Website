/*
 * Haidi contact form — Azure Static Web Apps API (Node 18+).
 *
 * Receives the "Prepare to launch" modal submission (same-origin POST to
 * /api/contact), appends a row to a SharePoint Excel table and emails a
 * notification — both via Microsoft Graph using app-only (client credentials)
 * auth. All secrets live in the Static Web App's application settings; nothing
 * sensitive ever reaches the browser.
 *
 * Required app settings (Azure portal ▸ Static Web App ▸ Configuration):
 *   AAD_TENANT_ID        Entra tenant (directory) ID
 *   AAD_CLIENT_ID        App registration (client) ID
 *   AAD_CLIENT_SECRET    App registration client secret
 *   GRAPH_SITE_ID        SharePoint site ID hosting the Excel file
 *   GRAPH_ITEM_ID        driveItem ID of the .xlsx file
 *   GRAPH_DRIVE_ID       (optional) drive ID, if the file isn't in the site's default library
 *   EXCEL_TABLE          Excel table name (default "Submissions")
 *   MAIL_SENDER          mailbox to send the notification FROM (UPN or object id)
 *   NOTIFY_EMAIL         recipient (default hello@haidi.io)
 *
 * See integrations/azure-contact-setup.md for the full one-time setup.
 */

const GRAPH = 'https://graph.microsoft.com/v1.0';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function (context, req) {
  const data = (req && req.body) || {};

  // Spam honeypot: a hidden field no human fills. If present, pretend success.
  if (data._gotcha) {
    context.res = json(200, { ok: true });
    return;
  }

  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const company = String(data.company || '').trim();
  const message = String(data.message || '').trim();
  const page = String(data._page || '').trim();

  if (!name || !company || !EMAIL_RE.test(email)) {
    context.res = json(400, { ok: false, error: 'Missing or invalid fields.' });
    return;
  }

  try {
    const token = await getToken();

    // The Excel row is the record of truth — it must succeed.
    await appendRow(token, [new Date().toISOString(), name, email, company, message, page]);

    // The email is best-effort: a transient mail hiccup shouldn't lose the lead.
    try {
      await sendMail(token, { name, email, company, message, page });
    } catch (mailErr) {
      context.log.warn('contact: row saved but email failed', mailErr && mailErr.message);
    }

    context.res = json(200, { ok: true });
  } catch (err) {
    context.log.error('contact: submission failed', err && err.message);
    context.res = json(500, { ok: false, error: 'Submission failed.' });
  }
};

function json(status, body) {
  return { status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

async function getToken() {
  const tenant = need('AAD_TENANT_ID');
  const body = new URLSearchParams({
    client_id: need('AAD_CLIENT_ID'),
    client_secret: need('AAD_CLIENT_SECRET'),
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function appendRow(token, values) {
  const item = need('GRAPH_ITEM_ID');
  const table = process.env.EXCEL_TABLE || 'Submissions';
  const base = process.env.GRAPH_DRIVE_ID
    ? `${GRAPH}/drives/${process.env.GRAPH_DRIVE_ID}/items/${item}`
    : `${GRAPH}/sites/${need('GRAPH_SITE_ID')}/drive/items/${item}`;

  const r = await fetch(`${base}/workbook/tables/${encodeURIComponent(table)}/rows/add`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [values] }),
  });
  if (!r.ok) throw new Error(`excel ${r.status}: ${await r.text()}`);
}

async function sendMail(token, d) {
  const sender = need('MAIL_SENDER');
  const to = process.env.NOTIFY_EMAIL || 'hello@haidi.io';
  const content =
    `Name:        ${d.name}\n` +
    `Work email:  ${d.email}\n` +
    `Company:     ${d.company}\n` +
    `Page:        ${d.page || '—'}\n\n` +
    `Message:\n${d.message || '(none)'}`;

  const r = await fetch(`${GRAPH}/users/${encodeURIComponent(sender)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: `New Haidi enquiry — ${d.company || d.name}`,
        body: { contentType: 'Text', content },
        toRecipients: [{ emailAddress: { address: to } }],
        replyTo: [{ emailAddress: { address: d.email } }],
      },
      saveToSentItems: false,
    }),
  });
  if (!r.ok) throw new Error(`mail ${r.status}: ${await r.text()}`);
}

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing app setting: ${name}`);
  return v;
}
