/**
 * Modelo padrão ETHOS de contrato de prestação de serviços psicológicos.
 * Usa variáveis {{placeholder}} que são substituídas automaticamente na página
 * de Contratos com dados do psicólogo e do paciente.
 *
 * Variáveis disponíveis:
 *   {{psychologist_name}}      — nome do(a) psicólogo(a)
 *   {{psychologist_crp}}       — CRP
 *   {{psychologist_rg_text}}   — ", portador(a) do RG ..." (vazio se não preenchido)
 *   {{psychologist_cpf_text}}  — ", CPF ..." (vazio se não preenchido)
 *   {{psychologist_title}}     — "Psicóloga" ou "Psicólogo"
 *   {{psychologist_suffix}}    — "a" ou "o"
 *   {{psychologist_article}}   — "a Sra." ou "o Sr."
 *   {{patient_name}}           — nome do paciente
 *   {{patient_cpf}}            — CPF do paciente
 *   {{patient_address}}        — endereço do paciente
 *   {{patient_gender_a}}       — "a" ou "o"
 *   {{patient_article}}        — "a" ou "o"
 *   {{contract_value}}         — valor formatado (ex: R$ 200,00)
 *   {{contract_value_text}}    — valor por extenso (ex: duzentos reais)
 *   {{payment_type}}           — "cada sessão realizada" ou "pacote mensal"
 */
export const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO DE PRESTAÇÃO DE SERVIÇO PROFISSIONAL PARA REALIZAÇÃO DO ATENDIMENTO PSICOLÓGICO

{{psychologist_title}}: {{psychologist_name}}

São partes no presente instrumento particular de Contrato de Prestação de Serviço Profissional, de um lado como CONTRATAD{{psychologist_suffix}}: {{psychologist_article}} {{psychologist_name}}, psicólog{{psychologist_suffix}} CRP: {{psychologist_crp}}{{psychologist_rg_text}}{{psychologist_cpf_text}}, e como CONTRATANTE: {{patient_name}}, CPF {{patient_cpf}}, residente e domiciliad{{patient_gender_a}} na cidade de {{patient_address}}.

Pelos serviços de Atendimento Psicológico prestados pela profissional {{psychologist_name}}, {{patient_article}} CONTRATANTE se compromete a pagar à CONTRATAD{{psychologist_suffix}} a importância de {{contract_value}} ({{contract_value_text}}) por {{payment_type}}.

NORMAS DE FUNCIONAMENTO:
Temos por finalidade o esclarecimento de alguns critérios básicos que englobam o bom funcionamento do tratamento, a fim de estabelecer com esses procedimentos a igualdade de direitos e deveres que norteiam nossos interesses comuns.

PROCEDIMENTOS E POLÍTICAS DE CONSULTA - PAGAMENTO E CONDUTAS:
1. O pagamento deve ser efetuado até o dia 10 do mês seguinte aos atendimentos, cobrindo o valor mensal dado pela quantidade total de sessões realizadas no mês.
2. O não comparecimento deve ser informado com antecedência de no mínimo 24 horas para que não seja cobrada a consulta. Caso não seja informado dentro deste prazo, a consulta será cobrada integralmente.
3. Cada sessão tem a duração de 50 a 60 minutos, com horário de término fixo, independentemente de atrasos d{{patient_gender_a}} paciente.
4. Duas faltas consecutivas sem justificativa podem resultar na concessão do horário para outr{{patient_gender_a}} paciente.
5. Se o não comparecimento for do profissional, a sessão não será cobrada ou será oferecida a possibilidade de reposição.

REAJUSTE CONTRATUAL:
Fica estipulado que o valor acordado pelo serviço de Atendimento Psicológico poderá ser reajustado mediante acordo mútuo entre a CONTRATAD{{psychologist_suffix}} e a CONTRATANTE. Tal reajuste será aplicado de forma a refletir eventuais mudanças nos custos de prestação do serviço e outros fatores pertinentes, com o objetivo de manter a equidade e a sustentabilidade do contrato ao longo do tempo.
Qualquer alteração no valor acordado será comunicada por escrito com antecedência mínima de 30 (trinta) dias antes da data de entrada em vigor do novo valor. Ambas as partes concordam em discutir de boa fé e de forma razoável quaisquer ajustes necessários, levando em consideração as condições econômicas vigentes e a qualidade dos serviços prestados.

OBSERVAÇÕES:
1. As sessões que incidirem em feriados serão descontadas na mensalidade ou poderão ser repostas de acordo com a disponibilidade de horários de ambas as partes.
2. É de extrema importância que se priorize o dia e horário do atendimento, para que outras atividades não venham a interferir na terapia.

Estou ciente e concordo com os termos estabelecidos neste contrato.

DATA: ____/____/________

____________________________________________
{{patient_name}} - Contratante

___________________________________________
{{psychologist_name}} - Contratad{{psychologist_suffix}}
CRP {{psychologist_crp}}
`;
