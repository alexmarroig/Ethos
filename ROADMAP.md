# ETHOS — ROADMAP V1

Este documento descreve a visão completa para a versão 1.0 do ETHOS, detalhando o status de implementação de cada funcionalidade.

## 1. Núcleo Clínico (Psicólogo)

- [x] **Registro de sessão por áudio offline:** Gravação e importação funcional.
- [x] **Transcrição offline via Whisper:** Implementado via job worker local.
- [x] **Prontuário automático (DRAFT):** Geração de texto baseada em transcrição.
- [x] **Validação humana obrigatória:** Fluxo de bloqueio pós-validação implementado.
- [x] **Exportações PDF/DOCX:** Funcional para notas validadas.
- [x] **Agenda e organização de sessões:** Implementado com integração ao banco de dados local.
- [x] **Gestão de Pacientes:** Implementado com integração ao banco de dados local.
- [ ] **Relatórios (Declarações/Relatórios):** [Not Implemented] Requer templates e finalidade explícita.
- [x] **Backup/Restore/Purge:** Implementado e exposto na UI de Configurações.

## 2. Gestão Financeira
- [ ] **Lançamento de cobranças e pagamentos:** [Not Implemented]
- [ ] **Gestão de pacotes e isenções:** [Not Implemented]
- [ ] **Relatórios financeiros básicos:** [Not Implemented]

## 3. Portal do Paciente
- [ ] **Acesso do paciente:** [Not Implemented]
- [ ] **Confirmação de sessão:** [Not Implemented]
- [ ] **Escalas e Diário:** [Not Implemented]
- [ ] **Mensagens:** [Not Implemented]

## 4. Integrações e UX
- [ ] **Lembretes WhatsApp (Manual):** [Not Implemented] Geração de texto e link wa.me.
- [x] **Admin Global (Camila):** [Implemented] Visão sanitizada de uso e erros.
- [ ] **Multi-usuário Real:** [Not Implemented] Isolamento completo de dados entre profissionais (atualmente focado em uso individual).
- [x] **Offline-First:** [Implemented] Arquitetura baseada em banco local e processamento no device.

---
**Legenda:**
- [x] **Implemented**: Funcionalidade completa e disponível no código.
- [ ] **Partially Implemented**: Código base ou UI existem, mas a integração não está completa.
- [ ] **Not Implemented**: Planejado, mas sem código funcional no momento.
