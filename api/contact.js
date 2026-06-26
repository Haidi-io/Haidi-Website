/* Vercel serverless — deliver launch-form submissions via webhook or Resend.
   Set CONTACT_WEBHOOK_URL (Slack/Zapier) and/or RESEND_API_KEY + CONTACT_TO_EMAIL. */
function formatBody(data) {
  var lines = ['New Haidi launch enquiry', ''];
  Object.keys(data).sort().forEach(function (k) {
    var v = data[k];
    if (v == null || v === '') return;
    if (Array.isArray(v)) v = v.join(', ');
    lines.push(k + ': ' + v);
  });
  return lines.join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var data = req.body || {};
  if (!data.email || !data.company) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  var webhook = process.env.CONTACT_WEBHOOK_URL;
  var resendKey = process.env.RESEND_API_KEY;
  var to = process.env.CONTACT_TO_EMAIL;
  var from = process.env.CONTACT_FROM_EMAIL || 'Haidi <onboarding@resend.dev>';
  var text = formatBody(data);

  if (webhook) {
    try {
      var wh = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, payload: data })
      });
      if (!wh.ok) return res.status(502).json({ error: 'Webhook delivery failed' });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(502).json({ error: 'Webhook unreachable' });
    }
  }

  if (resendKey && to) {
    try {
      var rs = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + resendKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: from,
          to: [to],
          reply_to: data.email,
          subject: 'Launch enquiry: ' + (data.company || 'Unknown'),
          text: text
        })
      });
      if (!rs.ok) return res.status(502).json({ error: 'Email delivery failed' });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(502).json({ error: 'Email service unreachable' });
    }
  }

  return res.status(503).json({ error: 'Contact delivery not configured' });
};
