# ETHOS Web Design Direction

## Scope

Este guia vale apenas para o produto web em `Frontend/`.

Objetivo:
- elevar o visual para um padrão premium e muito limpo;
- simplificar a experiência para psicólogos, sem exigir conhecimento técnico;
- usar a referência Apple como linguagem de rigor, clareza, foco e acabamento;
- preservar a identidade clínica do ETHOS, evitando virar uma cópia literal.

Princípios inegociáveis:
- o produto deve parecer profissional, silencioso e confiável;
- a interface deve sair da frente da tarefa;
- o conteúdo clínico e os dados do paciente são o centro;
- interações importantes devem ser óbvias e confortáveis;
- formulários e documentos precisam ser guiados, nunca “de código”.

---

## Core Feel

O web do ETHOS deve combinar:
- a disciplina visual da Apple;
- a serenidade de uma plataforma clínica;
- a praticidade de um sistema operacional de consultório.

Em termos de sensação:
- menos “dashboard genérico”;
- menos blocos soltos e excessivamente decorados;
- menos texto de interface disputando atenção;
- mais superfícies calmas, hierarquia forte e ação clara.

O resultado esperado:
- premium, mas não frio;
- minimalista, mas não vazio;
- elegante, mas funcional.

---

## Visual Language

### 1. Layout Rhythm

Inspirar-se na Apple em:
- áreas amplas de respiro;
- blocos grandes e bem definidos;
- conteúdo centralizado em containers largos;
- ritmo vertical limpo;
- poucas decisões visuais por tela.

Adaptar para ETHOS:
- preferir painéis amplos com conteúdo bem agrupado;
- usar separação por blocos clínicos, não por excesso de cards;
- destacar a tarefa principal da página antes de métricas secundárias;
- tratar dados sensíveis com aparência sóbria e organizada.

### 2. Background Strategy

Usar uma lógica de fundos inspirada na Apple:
- seções claras em `#f5f5f7` ou tons próximos;
- áreas de foco em branco quente ou quase branco;
- uso pontual de áreas escuras apenas quando houver intenção real.

No ETHOS:
- o padrão principal deve continuar claro;
- dark mode pode existir, mas não deve guiar a identidade;
- o fundo nunca deve competir com o conteúdo.

### 3. Surface Philosophy

Superfícies devem parecer:
- precisas;
- discretas;
- suaves;
- quase “editoriais”.

Regras:
- bordas suaves e finas;
- sombra rara e macia;
- quase nenhum ornamento;
- evitar aparência de “cartão genérico de SaaS”.

---

## Typography

### Primary Direction

Adotar no web uma hierarquia inspirada em Apple:
- títulos com presença;
- subtítulos curtos;
- corpo altamente legível;
- labels secos e diretos.

Se SF Pro não estiver disponível, usar uma pilha equivalente de alta qualidade:
- `-apple-system`
- `BlinkMacSystemFont`
- `"SF Pro Display"`
- `"SF Pro Text"`
- `"Inter"`
- `"Helvetica Neue"`
- `sans-serif`

### ETHOS Typography Rules

#### Display Titles
- uso: títulos principais de tela, modais importantes, áreas de documento;
- peso: 600;
- tracking: levemente negativo;
- line-height: bem justo;
- sensação: preciso, limpo, sofisticado.

#### Section Titles
- uso: cabeçalhos de blocos como “Histórico de sessões”, “Documentos”, “Financeiro”;
- peso: 600;
- contraste alto;
- menos ornamentação e menos serifas excessivas.

#### Body Text
- uso: descrições, campos, microcopys, contexto;
- tamanho confortável;
- contraste suficiente;
- nunca apertado demais;
- sempre orientado à leitura rápida.

#### Helper Text
- curto, claro, humano;
- evitar jargão técnico;
- explicar o mínimo necessário.

### Tone of Copy

O texto da interface deve soar:
- direto;
- gentil;
- clínico;
- sem exagero de marketing.

Exemplos de direção:
- usar “Salvar nova versão”;
- usar “Abrir em nova aba”;
- usar “Documento excluído”;
- evitar frases vagas e ornamentadas.

---

## Color System

### Base Palette

Usar a disciplina de cor da Apple, mas adaptada ao ETHOS:

- `--bg-page`: `#f5f5f7`
- `--bg-surface`: `#ffffff`
- `--bg-surface-soft`: `#fbfbfd`
- `--text-primary`: `#1d1d1f`
- `--text-secondary`: `rgba(29,29,31,0.72)`
- `--text-tertiary`: `rgba(29,29,31,0.48)`
- `--border-subtle`: `rgba(29,29,31,0.08)`
- `--border-soft`: `rgba(29,29,31,0.12)`

### Accent Strategy

Manter uma única família de destaque para interação:
- azul principal para links, focos e CTAs primários;
- o teal institucional do ETHOS pode continuar existindo, mas deve ser racionalizado.

Direção:
- Apple Blue para ações digitais e navegação;
- tons institucionais do ETHOS para contexto de marca, não para tudo.

Sugestão de papel:
- `--accent-primary`: `#0071e3`
- `--accent-primary-hover`: `#0077ed`
- `--accent-primary-foreground`: `#ffffff`

### Status Colors

Status devem existir, mas com sobriedade:
- confirmado;
- pendente;
- concluído;
- faltou;
- rascunho.

Regras:
- nada fluorescente;
- contraste suficiente;
- cor como apoio, nunca como único sinal.

---

## Component Direction

## Navigation

A navegação web deve evoluir para:
- barra lateral mais limpa;
- menos ruído visual;
- rótulos curtos;
- hierarquia forte do item ativo;
- sensação de precisão parecida com produtos Apple.

Regras:
- item ativo muito claro;
- ícones discretos;
- separadores raros;
- topografia mais refinada.

Se for revista depois:
- considerar cabeçalho com efeito de vidro sutil;
- considerar sidebar com superfície mais uniforme e menos blocada.

## Buttons

### Primary
- formato arredondado;
- preenchimento sólido;
- texto simples;
- sem bordas pesadas;
- deve parecer importante, não agressivo.

### Secondary
- fundo claro;
- borda discreta;
- bom para “Abrir”, “Nova sessão”, “Criar relatório”.

### Tertiary / Ghost
- quase invisível;
- usado para ações laterais;
- hover sutil.

### Destructive
- discreto porém claro;
- vermelho controlado;
- usado para “Excluir”.

## Cards and Sections

Em vez de multiplicar cards pequenos:
- agrupar por intenção;
- usar seções largas e organizadas;
- reduzir duplicação de containers.

Uma seção boa deve:
- ter título claro;
- um subtítulo curto;
- conteúdo com respiro;
- ações próximas do conteúdo que afetam.

## Forms

Formulários do ETHOS web devem seguir:
- uma coluna quando possível;
- duas colunas só quando fizer sentido real;
- labels muito claros;
- ajuda contextual breve;
- campos com altura confortável;
- espaçamento generoso.

Para documentos:
- nunca expor HTML ao profissional;
- sempre preferir formulário guiado;
- preview ao lado ou abaixo;
- salvar como versão sem fricção.

## Document Workspace

Direção para o fluxo de documentos no web:
- preview grande;
- formulário estruturado;
- persistência de campos;
- edição por tipo de documento;
- botão de abrir em nova aba;
- salvar nova versão sem assustar o usuário.

Prioridade de UX:
1. entender o documento;
2. preencher campos;
3. revisar visualmente;
4. salvar;
5. exportar/compartilhar.

Evitar:
- código bruto;
- JSON;
- nomenclatura técnica;
- estados ambíguos.

---

## Motion

Motion deve seguir a lógica Apple:
- pouca;
- suave;
- útil;
- elegante.

Regras:
- entradas curtas;
- hover discreto;
- transições de estado fluidas;
- evitar “efeitos”.

Usar animação para:
- troca de conteúdo;
- abertura de modal;
- foco em preview;
- confirmação de salvar.

Não usar animação para:
- chamar atenção sem motivo;
- compensar falta de hierarquia.

---

## Document and Clinical UX Rules

Como o ETHOS é produto clínico, a inspiração Apple precisa ser filtrada por contexto profissional.

### O sistema nunca pode parecer brinquedo
- sem excesso de brilho;
- sem microinteração infantil;
- sem gradientes chamativos;
- sem visual de app social.

### O sistema precisa inspirar confiança documental
- documentos devem parecer oficiais;
- histórico deve ser fácil de rastrear;
- status devem ser legíveis;
- ações destrutivas devem ser seguras.

### O psicólogo deve sentir que “está tudo sob controle”
- ações previsíveis;
- poucos caminhos concorrentes;
- linguagem direta;
- interface calma.

---

## Responsive Rules

Aplicar primeiro no web, mas com comportamento consistente:

### Desktop
- experiência principal;
- seções amplas;
- preview lateral;
- informações distribuídas com conforto.

### Tablet
- manter a mesma lógica;
- reorganizar em empilhamento parcial;
- preservar preview útil.

### Mobile Web
- não tentar reproduzir o desktop inteiro;
- priorizar leitura e ação;
- preview abaixo do formulário;
- botões maiores;
- evitar overflow escondido e áreas espremidas.

---

## What To Improve Next In Web

### Priority 1
- revisar sidebar para um visual mais Apple-like e menos “admin panel”;
- revisar cabeçalhos de página;
- limpar excesso de bordas;
- melhorar ações primárias/secundárias;
- consolidar blocos repetitivos.

### Priority 2
- criar sistema de formulários guiados para todos os documentos principais;
- padronizar preview/editor de documentos;
- melhorar histórico de sessões e timeline clínica;
- criar estados vazios mais elegantes e mais úteis.

### Priority 3
- revisar dashboard “Início” com acabamento premium;
- melhorar finance e documentos com mais foco e menos ruído;
- preparar tokens consistentes de spacing, radius e shadow.

---

## Do

- usar a referência Apple como padrão de rigor visual;
- manter a identidade clínica do ETHOS;
- desenhar para clareza, não para efeito;
- reduzir ruído visual;
- priorizar tipografia e espaçamento;
- fazer a interface parecer cara, mas simples;
- transformar fluxos técnicos em fluxos guiados.

## Don’t

- não copiar Apple literalmente;
- não usar HTML cru, JSON ou estruturas técnicas na frente do usuário;
- não encher a tela de cards;
- não exagerar sombras, gradientes ou cores;
- não tratar profissional de saúde como usuário técnico;
- não esconder ações importantes em microdetalhes;
- não sacrificar legibilidade por “minimalismo”.

---

## Practical Rule For This Repo

Sempre que uma nova tela web for criada ou revisada:
- primeiro perguntar se a informação está clara;
- depois reduzir ruído;
- depois refinar tipografia, spacing e hierarquia;
- por último aplicar polimento visual.

Ordem correta:
1. clareza;
2. fluxo;
3. legibilidade;
4. acabamento.

Se houver dúvida entre “bonito” e “óbvio”, escolher “óbvio”.

