# Segurança e Sigilo

- Conteúdo clínico permanece local/offline por padrão.
- Control plane rejeita telemetria com campos proibidos (`text`, `transcript`, `patient`, `audio`, `file_path`, `content`).
- Admin global só recebe dados sanitizados e agregados.
- Prontuário nasce em DRAFT e exige validação humana explícita.
- Logs e telemetria evitam payload clínico.
