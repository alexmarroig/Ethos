const { chromium } = require('playwright');

(async()=>{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`console: ${msg.text()}`); });

  const results = [];
  const ok = (name, extra='') => results.push({ name, ok: true, extra });
  const fail = (name, err) => results.push({ name, ok: false, extra: String(err) });

  try {
    await page.goto('http://127.0.0.1:8080', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('seu@email.com').fill('psi.camilafreitas@gmail.com');
    await page.getByPlaceholder('••••••••').fill('Bianco256');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    if (await page.getByText('Camila Veloso de Freitas').count()) ok('login'); else throw new Error('login marker missing');
  } catch (err) { fail('login', err); }

  const clickNav = async (label) => {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  };

  try {
    await clickNav('Agenda clínica');
    await page.getByRole('button', { name: 'Agendar sessao' }).click();
    await page.locator('select').first().selectOption({ label: 'Felipe' });
    const inputs = page.locator('input');
    await inputs.nth(0).fill('2026-04-10');
    await inputs.nth(1).fill('09:00');
    await inputs.nth(2).fill('50');
    await page.getByRole('button', { name: 'Agendar' }).click();
    await page.waitForTimeout(1000);
    ok('agenda');
  } catch (err) { fail('agenda', err); }

  try {
    await clickNav('Diário e formulários');
    await page.getByRole('button', { name: 'Nova entrada' }).click();
    const selects = page.locator('select');
    await selects.nth(1).selectOption({ index: 1 });
    await selects.nth(2).selectOption({ label: 'Felipe' });
    await page.getByPlaceholder('Dados do formulário em texto livre ou JSON').fill('{"texto":"registro teste"}');
    await page.getByRole('button', { name: 'Registrar' }).click();
    await page.waitForTimeout(1000);
    ok('formularios');
  } catch (err) { fail('formularios', err); }

  try {
    await clickNav('Anamnese');
    await page.getByRole('button', { name: 'Nova anamnese' }).click();
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ label: 'Felipe' });
    await page.getByPlaceholder('Histórico pessoal').fill('Paciente com histórico de ansiedade.');
    await page.getByPlaceholder('Histórico familiar').fill('Sem intercorrências relevantes.');
    await page.getByRole('button', { name: 'Salvar anamnese' }).click();
    await page.waitForTimeout(1000);
    ok('anamnese');
  } catch (err) { fail('anamnese', err); }

  try {
    await clickNav('Relatórios');
    await page.getByRole('button', { name: 'Novo relatório' }).click();
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ label: 'Felipe' });
    await page.getByPlaceholder('Escreva o rascunho inicial do relatório. Depois você pode revisar e complementar.').fill('Relatório inicial para acompanhamento clínico.');
    await page.getByRole('button', { name: 'Criar relatório' }).click();
    await page.waitForTimeout(1000);
    ok('relatorios');
  } catch (err) { fail('relatorios', err); }

  try {
    await clickNav('Documentos');
    await page.getByRole('button', { name: 'Novo documento' }).click();
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ label: 'Felipe' });
    await page.getByRole('button', { name: 'Criar documento' }).click();
    await page.waitForTimeout(1000);
    ok('documentos');
  } catch (err) { fail('documentos', err); }

  try {
    await clickNav('Contratos');
    await page.getByRole('button', { name: 'Novo contrato' }).click();
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ label: 'Felipe' });
    await page.getByPlaceholder('Valor ou pacote (ex.: R$ 220,00 por sessão)').fill('220');
    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await page.waitForTimeout(1500);
    ok('contratos');
  } catch (err) { fail('contratos', err); }

  console.log(JSON.stringify({ results, consoleErrors }, null, 2));
  await browser.close();
})();
