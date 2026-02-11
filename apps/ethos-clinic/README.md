# ETHOS Clinic (Clinical Plane)

Serviço clínico local/offline-first do ETHOS.

## Escopo
O `apps/ethos-clinic` concentra a API clínica executada no ambiente local (desktop/mobile/edge local), reaproveitando o código base originalmente incubado em `apps/ethos-backend/src`.

## Fronteira de dados

### Permitido no Clinical Plane
- Identificadores e cadastro de pacientes (`patient_id`, nome, documento, dados de contato).
- Conteúdo clínico sensível: sessões, transcrições, notas clínicas, formulários, escalas, diário e relatórios.
- Arquivos e metadados locais: referências de áudio, backup/restore/purge e trilhas de auditoria clínicas.

### Proibido no Clinical Plane
- Dependência de dados administrativos globais como fonte de verdade para atendimento (billing/entitlements devem ser apenas sinal de habilitação).
- Compartilhar PHI automaticamente com serviços cloud sem sanitização explícita e consentimento.

## Integração com o Control Plane
- O Clinic consome somente dados sanitizados de conta/entitlements.
- O Clinic nunca exporta por padrão payload bruto de prontuário/transcrição para o Control Plane.
