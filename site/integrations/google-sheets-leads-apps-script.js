/**
 * ETHOS lead capture endpoint for Google Sheets Apps Script.
 *
 * Como usar:
 * 1. Crie uma planilha "Leads ETHOS".
 * 2. Na primeira linha, crie as colunas:
 *    Data | Nome | Email | WhatsApp | Perfil | Interesse | Origem | UTM Source | UTM Medium | UTM Campaign | UTM Term | UTM Content | User Agent
 * 3. Abra Extensoes > Apps Script.
 * 4. Cole este arquivo.
 * 5. Implante como App da Web:
 *    - Executar como: Eu
 *    - Quem tem acesso: Qualquer pessoa
 * 6. Copie a URL /exec e use como VITE_LEAD_ENDPOINT no deploy do site.
 */

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const payload = JSON.parse(e.postData.contents || "{}");

    sheet.appendRow([
      new Date(),
      sanitize_(payload.name),
      sanitize_(payload.email),
      sanitize_(payload.whatsapp),
      sanitize_(payload.profile),
      sanitize_(payload.interest),
      sanitize_(payload.source || "ethos_site"),
      sanitize_(payload.utm_source),
      sanitize_(payload.utm_medium),
      sanitize_(payload.utm_campaign),
      sanitize_(payload.utm_term),
      sanitize_(payload.utm_content),
      sanitize_(payload.user_agent),
    ]);

    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function doGet() {
  return json_({ ok: true, service: "ethos_leads" });
}

function sanitize_(value) {
  if (value === null || value === undefined) return "";
  return String(value).slice(0, 500).replace(/[\r\n]+/g, " ").trim();
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
