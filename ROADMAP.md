# ETHOS — ROADMAP V1

Este documento descreve a visão completa para a versão 1.0 do ETHOS, detalhando o status de implementação de cada funcionalidade.

## 1. Núcleo Clínico (Psicólogo)

- [x] **Registro de sessão por áudio offline:** Gravação e importação funcional.
- [x] **Transcrição offline via Whisper:** Implementado via job worker local.
- [x] **Prontuário automático (DRAFT):** Geração de texto baseada em transcrição.
- [x] **Validação humana obrigatória:** Fluxo de bloqueio pós-validação implementado.
- [x] **Exportações PDF/DOCX:** Funcional para notas validadas.
- [x] **Agenda e organização de sessões:** Implementado com integração ao banco de dados local e visão de detalhes.
- [x] **Gestão de Pacientes:** Ficha completa implementada (CPF, Endereço, Rede de Apoio, etc).
- [x] **Relatórios (Declarações/Relatórios):** Implementado com templates GenAI (Declaração, Relatório, Laudo).
- [x] **Backup/Restore/Purge:** Implementado e exposto na UI de Configurações.

## 2. Gestão Financeira
- [x] **Lançamento de cobranças e pagamentos:** Implementado com persistência local e geração de Recibo PDF.
- [ ] **Gestão de pacotes e isenções:** [Not Implemented]
- [x] **Relatórios financeiros básicos:** Resumo de saldo por paciente e histórico completo.

## 3. Portal do Paciente
- [x] **App Mobile (Alpha):** Estrutura Expo inicializada no monorepo.
- [ ] **Confirmação de sessão:** [Not Implemented]
- [x] **Escalas e Diário:** Implementado no núcleo (DB) com templates de Sonhos e Emoções.
- [ ] **Mensagens:** [Not Implemented]

## 4. Integrações e UX
- [x] **Lembretes WhatsApp (Manual):** Implementado (Satélite) com templates customizáveis.
- [x] **Autenticação Real:** Sistema de login para Psicólogos e Pacientes com persistência segura e Splash animado.
- [x] **Admin Global (Camila):** [Implemented] Visão sanitizada de uso e erros.
- [ ] **Multi-usuário Real:** [Not Implemented] Isolamento completo de dados entre profissionais (atualmente focado em uso individual).
- [x] **Offline-First:** [Implemented] Arquitetura baseada em banco local e processamento no device.

---
**Legenda:**
- [x] **Implemented**: Funcionalidade completa e disponível no código.
- [ ] **Partially Implemented**: Código base ou UI existem, mas a integração não está completa.
- [ ] **Not Implemented**: Planejado, mas sem código funcional no momento.
