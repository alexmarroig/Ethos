/**
 * Script Node.js + Express para endpoint de health check.
 *
 * Como executar localmente:
 * 1) npm init -y
 * 2) npm install express
 * 3) node health-server.js
 *
 * Endpoint exposto:
 * GET /health -> HTTP 200 + JSON {"status":"ok"}
 */

// Importa o framework Express para criar o servidor HTTP.
const express = require('express');

// Cria a aplicação Express.
const app = express();

// Porta padrão do servidor.
// Usa a variável de ambiente PORT quando existir (útil para deploy em nuvem)
// e cai para 3000 em ambiente local.
const PORT = process.env.PORT || 3000;

// Define o endpoint de health check.
// Esse endpoint serve para monitoramento externo validar se a API está no ar.
app.get('/health', (req, res) => {
  // Retorna status HTTP 200 (OK) com payload JSON simples.
  res.status(200).json({ status: 'ok' });
});

// Inicializa o servidor e exibe log com a URL base.
app.listen(PORT, () => {
  console.log(`Servidor online em http://localhost:${PORT}`);
  console.log(`Health check em http://localhost:${PORT}/health`);
});

/**
 * =========================
 * MONITOR EXTERNO (5 MIN)
 * =========================
 *
 * Opção 1: UptimeRobot
 * 1) Faça deploy deste serviço e copie a URL pública, por exemplo:
 *    https://minha-api.exemplo.com/health
 * 2) No UptimeRobot: Add New Monitor.
 * 3) Monitor Type: HTTP(s)
 * 4) Friendly Name: API Health
 * 5) URL: https://minha-api.exemplo.com/health
 * 6) Monitoring Interval: 5 minutes
 * 7) (Opcional) Alert Contacts para e-mail/Slack/SMS.
 *
 * Opção 2: cron-job.org
 * 1) Crie conta e clique em "Create cronjob".
 * 2) URL: https://minha-api.exemplo.com/health
 * 3) Request method: GET
 * 4) Schedule: every 5 minutes (cron: a cada 5 min)
 * 5) Habilite notificações por e-mail em caso de falha.
 *
 * Dica:
 * - Mantenha esse endpoint leve e sem autenticação para monitoramento externo.
 * - Se precisar proteger, permita IPs do serviço de monitoria ou token específico.
 */
