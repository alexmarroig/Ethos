# ETHOS Clinical Data Map

## Dados sensíveis hoje

### Muito sensíveis
- Pacientes: nome, email, telefone, WhatsApp, CPF, nascimento, endereço, profissão, contatos de emergência
- Saúde mental: queixa principal, observações clínicas, evolução, plano terapêutico
- Áudio e transcrição: gravações de sessão e texto transcrito
- Documentos clínicos: recibos, declarações, relatórios, atestados, contratos

### Sensíveis
- Financeiro: valores, vencimentos, forma de pagamento, notas
- Auditoria: eventos de acesso e validação
- Notificações: destinatários, mensagens, links de entrega

## Onde cada dado fica hoje

### Banco local persistido
- Arquivo: `apps/ethos-clinic/data/clinic-data.json`
- Conteúdo:
  - pacientes
  - sessões
  - transcrições
  - prontuários
  - relatórios
  - documentos
  - contratos
  - financeiro
  - lembretes e logs de notificação

### Arquivos locais
- Áudios enviados pelo web:
  - pasta: `apps/ethos-clinic/data/uploads`
- PDFs exportados:
  - gerados sob demanda e devolvidos ao cliente
- Backups:
  - dependem do fluxo manual/exportação usado pelo operador

## Organização mais segura recomendada

### 1. Separar dados por domínio
- `patients.json`
- `clinical-records.json`
- `documents.json`
- `contracts.json`
- `finance.json`
- `notifications.json`
- `audit.json`

Benefício:
- reduz blast radius
- facilita backup seletivo
- simplifica retenção por categoria

### 2. Tirar áudio bruto do mesmo ciclo do JSON principal
- manter apenas metadados no banco
- armazenar binários em pasta dedicada com política de retenção
- limpar automaticamente o arquivo bruto após transcrição validada, se permitido

### 3. Criptografar em repouso os dados mais críticos
- prontuários
- transcrições
- documentos
- contratos
- CPF
- contatos de emergência

### 4. Separar segredos/configurações do dado clínico
- webhook de WhatsApp
- webhook de email
- chaves externas
- preferências operacionais

## Backup/export recomendado

### Rotina mínima
1. backup diário do `clinic-data.json`
2. backup da pasta `data/uploads` se o áudio bruto ainda precisar ser preservado
3. export mensal de documentos/contratos em pasta organizada por paciente

### Estrutura sugerida
```text
backups/
  2026-04-13/
    clinic-data.json
    uploads/
    exports/
      pacientes/
      contratos/
      prontuarios/
      documentos/
```

### Estratégia operacional
- diário: snapshot local completo
- semanal: cópia externa criptografada
- mensal: export legível para conferência humana

## Observação importante

Hoje o ETHOS local usa persistência simples em JSON, o que é bom para velocidade de desenvolvimento e recuperação manual.
Para produção com dados clínicos reais, o ideal é evoluir para:
- banco transacional
- criptografia em repouso
- trilha de auditoria separada
- política de retenção por categoria
