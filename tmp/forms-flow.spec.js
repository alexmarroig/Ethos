const { test, expect } = require("playwright/test");

const APP_URL = "http://127.0.0.1:8080";

test("psychologist publishes form, patient submits, psychologist sees response", async ({ browser }) => {
  const psychologist = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const psychPage = await psychologist.newPage();

  await psychPage.goto(APP_URL, { waitUntil: "networkidle" });
  await psychPage.fill('input[type="email"]', "psi.camilafreitas@gmail.com");
  await psychPage.fill('input[type="password"]', "admin123");
  await psychPage.getByRole("button", { name: /entrar/i }).click();
  await psychPage.waitForLoadState("networkidle");

  await psychPage.getByRole("link", { name: /diário e formulários/i }).click();
  await psychPage.waitForLoadState("networkidle");
  await psychPage.screenshot({ path: "tmp/playwright-forms-psychologist-before.png", fullPage: true });

  const publishButtons = psychPage.getByRole("button", { name: /disponibilizar/i });
  await expect(publishButtons.first()).toBeVisible();
  await publishButtons.first().click();

  const shareDialog = psychPage.getByRole("dialog");
  await expect(shareDialog).toBeVisible();
  await shareDialog.locator("select").first().selectOption({ label: "Alex (Teste)" });
  await psychPage.getByRole("button", { name: /^disponibilizar$/i }).click();
  await psychPage.waitForTimeout(1200);

  await psychPage.screenshot({ path: "tmp/playwright-forms-psychologist-after-publish.png", fullPage: true });

  const patient = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const patientPage = await patient.newPage();

  await patientPage.goto(APP_URL, { waitUntil: "networkidle" });
  await patientPage.fill('input[type="email"]', "alex.c.marroig@gmail.com");
  await patientPage.fill('input[type="password"]', "teste256");
  await patientPage.getByRole("button", { name: /entrar/i }).click();
  await patientPage.waitForLoadState("networkidle");

  await patientPage.getByRole("link", { name: /diário e formulários/i }).click();
  await patientPage.waitForLoadState("networkidle");
  await expect(patientPage.getByText(/diário emocional/i).first()).toBeVisible();
  await patientPage.screenshot({ path: "tmp/playwright-forms-patient-before.png", fullPage: true });

  const fields = patientPage.locator("input, textarea").filter({ hasNot: patientPage.locator('[type="hidden"]') });
  await fields.nth(0).fill("8");
  await fields.nth(1).fill("calma");
  await fields.nth(2).fill("dia produtivo");

  await patientPage.getByRole("button", { name: /enviar resposta/i }).click();
  await patientPage.waitForTimeout(1500);
  await patientPage.screenshot({ path: "tmp/playwright-forms-patient-after.png", fullPage: true });
  await expect(patientPage.getByText(/respostas enviadas/i)).toBeVisible();

  await psychPage.bringToFront();
  await psychPage.reload({ waitUntil: "networkidle" });
  await psychPage.getByRole("link", { name: /diário e formulários/i }).click();
  await psychPage.waitForLoadState("networkidle");
  await psychPage.screenshot({ path: "tmp/playwright-forms-psychologist-after-response.png", fullPage: true });

  await expect(psychPage.getByText(/enviado pelo paciente/i).first()).toBeVisible();

  await patient.close();
  await psychologist.close();
});
