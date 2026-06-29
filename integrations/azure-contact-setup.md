# Contact form → SharePoint Excel + email (Azure + Microsoft Graph)

The "Prepare to launch" modal POSTs to the same-origin Azure Static Web Apps API
at **`/api/contact`** (`api/contact/index.js`). The function uses **Microsoft
Graph** (app-only auth) to:

1. append a row to a **SharePoint Excel** table, and
2. email a notification to **hello@haidi.io**.

All secrets live in the Static Web App's application settings — nothing sensitive
is ever sent to the browser.

---

## 1. App registration (Microsoft Entra ID)

1. Entra admin centre ▸ **App registrations ▸ New registration** (e.g. "Haidi web form"). Single tenant is fine.
2. **Certificates & secrets ▸ New client secret** → copy the **Value**.
3. Note the **Directory (tenant) ID** and **Application (client) ID**.
4. **API permissions ▸ Add ▸ Microsoft Graph ▸ Application permissions**:
   - `Sites.Selected` — *recommended* (least privilege; grant per-site in step 2), or `Sites.ReadWrite.All` if you can't use Sites.Selected.
   - `Mail.Send`
   Then **Grant admin consent**.

## 2. SharePoint Excel file

1. In the target SharePoint site, create an Excel workbook (e.g. `Haidi-Enquiries.xlsx`).
2. Add a header row and **format it as a Table** (Insert ▸ Table). Name the table
   **`Submissions`** (Table Design ▸ Table Name). Columns, in order:
   `Timestamp | Name | Work email | Company | Message | Page`.
3. Get the Graph IDs (use Graph Explorer, signed in):
   - Site:  `GET /sites/{hostname}:/sites/{site-path}`  → `id` ⇒ **GRAPH_SITE_ID**
   - File:  `GET /sites/{GRAPH_SITE_ID}/drive/root:/Haidi-Enquiries.xlsx` → `id` ⇒ **GRAPH_ITEM_ID**
     (if the file is in a non-default library, also capture that drive's id ⇒ **GRAPH_DRIVE_ID**)
4. If you used **`Sites.Selected`**, grant this app write access to just that site
   (run as an admin in Graph Explorer):
   ```
   POST /sites/{GRAPH_SITE_ID}/permissions
   {
     "roles": ["write"],
     "grantedToIdentities": [{ "application": { "id": "{AAD_CLIENT_ID}", "displayName": "Haidi web form" } }]
   }
   ```

## 3. Sending mailbox

`MAIL_SENDER` is the mailbox the notification is sent **from** (e.g.
`noreply@haidi.io` or `hello@haidi.io`). With `Mail.Send` (application) the app can
send as any mailbox; to lock it to one, apply an **Application Access Policy**
(Exchange Online PowerShell, `New-ApplicationAccessPolicy`) scoped to that mailbox.

## 4. Static Web App settings

Azure portal ▸ your Static Web App ▸ **Configuration** ▸ Application settings:

| Name | Value |
|------|-------|
| `AAD_TENANT_ID` | directory (tenant) ID |
| `AAD_CLIENT_ID` | application (client) ID |
| `AAD_CLIENT_SECRET` | the client secret value |
| `GRAPH_SITE_ID` | from step 2 |
| `GRAPH_ITEM_ID` | from step 2 |
| `GRAPH_DRIVE_ID` | *(only if non-default library)* |
| `EXCEL_TABLE` | `Submissions` |
| `MAIL_SENDER` | sending mailbox (UPN) |
| `NOTIFY_EMAIL` | `hello@haidi.io` |

For local dev, copy `api/local.settings.json.example` → `api/local.settings.json`
and fill the same values (git-ignored).

## 5. Deploy config (Static Web Apps build)

- **app location:** `/`   ·   **output location:** `dist`   ·   **api location:** `api`
- `staticwebapp.config.json` pins the API runtime to `node:18` and adds security headers.

---

### Notes
- A hidden honeypot field (`_gotcha`) drops obvious bots server-side.
- The Excel row is the record of truth; the email is best-effort (a mail hiccup
  won't lose the lead — it's logged in the function's Application Insights).
- Until the API is live (e.g. on the current Vercel preview), the form simply
  shows the thank-you screen without storing anything.
