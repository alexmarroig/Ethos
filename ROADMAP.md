# ETHOS — ROADMAP V1

Este documento descreve a visão completa para a versão 1.0 do ETHOS, detalhando o status de implementação de cada funcionalidade.

## 1. Núcleo Clínico (Psicólogo)

- [x] **Registro de sessão por áudio offline:** Gravação e importação funcional no Mobile.
- [x] **Transcrição offline via Whisper:** Implementado via job worker local.
- [x] **Prontuário automático (DRAFT):** Geração de texto baseada em transcrição seguindo normas SOAP/CRP.
- [x] **Validação humana obrigatória:** Fluxo de bloqueio pós-validação implementado.
- [x] **Exportações PDF/DOCX:** Funcional para notas validadas e documentos clínicos.
- [x] **Agenda e organização de sessões:** Implementado com recorrência e lembretes automáticos.
- [x] **Gestão de Pacientes:** Ficha completa implementada (CPF, Endereço, Contato de Emergência, etc).
- [x] **Documentos CRP:** Central de documentos com categorias (Recibo, Declaração, Atestado, Relatório, Contrato, Questionário).
- [x] **Backup/Restore/Purge:** Implementado e exposto na UI de Configurações.

## 2. Gestão Financeira
- [x] **Lançamento de cobranças e pagamentos:** Implementado com persistência local e lembrete via WhatsApp.
- [x] **Gestão de pacotes e isenções:** Suporte básico a modo de cobrança (sessão vs pacote) na ficha do paciente.
- [x] **Relatórios financeiros básicos:** Resumo de saldo por paciente e histórico completo.

## 3. Portal do Paciente
- [x] **App Mobile (Alpha):** Estrutura Expo funcional com navegação dedicada.
- [x] **Diário e Documentos:** Paciente pode visualizar o que for liberado pelo psicólogo.
- [x] **Convite WhatsApp:** Fluxo de convite direto do psicólogo para o paciente.

## 4. Integrações e UX
- [x] **Lembretes WhatsApp (Manual):** Implementado (Satélite) para sessões e cobranças.
- [x] **Autenticação Real:** Sistema de login com perfis (Psicólogo, Secretária, Paciente).
- [x] **Dashboard RBAC:** Visão simplificada para secretária (bloqueio de dados clínicos).
- [x] **Notificações Inteligentes:** Triggers mockados para ações críticas no Mobile.
- [x] **Unificação Web/Mobile:** Mesma base de código (Expo PWA) garantindo consistência.

---
**Legenda:**
- [x] **Implemented**: Funcionalidade completa e disponível no código.
- [ ] **Partially Implemented**: Código base ou UI existem, mas a integração não está completa.
- [ ] **Not Implemented**: Planejado, mas sem código funcional no momento.
