import { type FormEvent, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { BIOHUB_REGISTER_URL } from "@/config/biohub";
import { APP_URL, CONTACT_EMAIL } from "@/config/site";
import { findFreeTool, type FreeTool } from "@/data/freeTools";
import { useSeo } from "@/lib/seo";
import { breadcrumbSchema, faqSchema, organizationSchema } from "@/lib/schemas";
import { trackEvent, trackGoogleAdsConversion } from "@/lib/tracking";

const LEAD_ENDPOINT = import.meta.env.VITE_LEAD_ENDPOINT;

const honorariosRows = [
  {
    item: "Consulta psicologica",
    fonte: "CFP/FENAPSI",
    referencia: "R$ 225,58 / R$ 337,17 / R$ 386,72",
    observacao: "Faixas inferior, media e superior da tabela nacional atualizada ate junho/2025.",
  },
  {
    item: "Psicoterapia individual",
    fonte: "CFP/FENAPSI",
    referencia: "Consultar tabela oficial",
    observacao: "O PDF oficial tem item proprio para psicoterapia individual. Confira antes de usar em proposta comercial.",
  },
  {
    item: "Valor praticado por cidade/UF",
    fonte: "Pesquisa local",
    referencia: "Nao oficial",
    observacao: "Informe um valor de mercado local apenas se voce tiver uma fonte propria confiavel.",
  },
];

const readAttribution = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_term: params.get("utm_term") || "",
    utm_content: params.get("utm_content") || "",
    user_agent: window.navigator.userAgent,
  };
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard is best effort only.
  }
};

const ResultBox = ({ title, text, tool }: { title: string; text: string; tool: FreeTool }) => (
  <div className="rounded-2xl border border-[#1A2D42] bg-[#07111F] p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">Resultado</p>
        <h2 className="mt-2 text-2xl font-bold text-[#EDF2F7]">{title}</h2>
      </div>
      <button
        type="button"
        onClick={() => {
          void copyText(text);
          trackEvent("tool_use", { tool: tool.slug, location: "copy_result", source: "ethos_tool" });
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-[#1A2D42] px-3 py-2 text-xs font-semibold text-[#EDF2F7]"
      >
        <Copy className="h-4 w-4" />
        Copiar
      </button>
    </div>
    <pre className="mt-5 whitespace-pre-wrap rounded-xl bg-[#0D1B2E] p-4 text-sm leading-7 text-[#B8C7D9]">{text}</pre>
  </div>
);

const ReferencePanel = ({ tool }: { tool: FreeTool }) => {
  if (!tool.references?.length && tool.toolType !== "pricing") return null;

  return (
    <div className="rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/55 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">Base oficial</p>
      <h2 className="mt-2 text-2xl font-bold text-[#EDF2F7]">Referencias usadas nesta ferramenta</h2>
      <div className="mt-5 space-y-3">
        {tool.references?.map((reference) => (
          <a
            key={reference.url}
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-[#1A2D42] bg-[#060F1E] p-4 transition hover:border-[#4ECDC4]"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-[#EDF2F7]">
              {reference.label}
              <ExternalLink className="h-4 w-4 text-[#4ECDC4]" />
            </span>
            <span className="mt-2 block text-sm leading-6 text-[#8EA9BD]">{reference.note}</span>
          </a>
        ))}
      </div>

      {tool.toolType === "pricing" ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-[#1A2D42]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#07111F] text-xs uppercase tracking-widest text-[#8EA9BD]">
              <tr>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Fonte</th>
                <th className="px-4 py-3">Valor/base</th>
                <th className="px-4 py-3">Uso correto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2D42] text-[#B8C7D9]">
              {honorariosRows.map((row) => (
                <tr key={row.item}>
                  <td className="px-4 py-3 font-semibold text-[#EDF2F7]">{row.item}</td>
                  <td className="px-4 py-3">{row.fonte}</td>
                  <td className="px-4 py-3">{row.referencia}</td>
                  <td className="px-4 py-3">{row.observacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

const ToolLeadForm = ({ tool }: { tool: FreeTool }) => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    profile: "Psicologa",
    interest: tool.title,
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    trackEvent("lead_submit", { source: "ethos_tool", tool: tool.slug, interest: form.interest, profile: form.profile });
    trackGoogleAdsConversion();

    const payload = { ...form, ...readAttribution(), source: "ethos_tool", tool: tool.slug };

    try {
      if (LEAD_ENDPOINT) {
        await fetch(LEAD_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      } else {
        const body = encodeURIComponent(
          `Nome: ${form.name}\nEmail: ${form.email}\nWhatsApp: ${form.whatsapp}\nPerfil: ${form.profile}\nFerramenta: ${tool.title}`,
        );
        window.open(`mailto:${CONTACT_EMAIL}?subject=Lead%20Ferramenta%20ETHOS&body=${body}`, "_blank", "noopener,noreferrer");
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <div className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Contato registrado</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#B8C7D9]">
          Recebemos seu interesse. Nada de dados clinicos foi coletado nesta ferramenta.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/70 p-5">
      <h2 className="text-2xl font-bold text-[#EDF2F7]">Receber proximos recursos ETHOS</h2>
      <p className="mt-2 text-sm leading-6 text-[#6B8FA8]">
        Deixe um contato profissional para receber materiais e novidades. Nao envie dados clinicos ou informacoes de pacientes.
      </p>
      <div className="mt-5 grid gap-3">
        <input
          required
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="h-11 rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm text-[#EDF2F7] outline-none focus:border-[#4ECDC4]"
          placeholder="Nome"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          className="h-11 rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm text-[#EDF2F7] outline-none focus:border-[#4ECDC4]"
          placeholder="Email profissional"
        />
        <input
          value={form.whatsapp}
          onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
          className="h-11 rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm text-[#EDF2F7] outline-none focus:border-[#4ECDC4]"
          placeholder="WhatsApp opcional"
        />
        <select
          value={form.profile}
          onChange={(event) => setForm((current) => ({ ...current, profile: event.target.value }))}
          className="h-11 rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm text-[#EDF2F7] outline-none focus:border-[#4ECDC4]"
        >
          <option>Psicologa</option>
          <option>Psicologo</option>
          <option>Clinica</option>
          <option>Estudante</option>
          <option>Outro</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6F73] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Quero receber
      </button>
    </form>
  );
};

const ToolExperience = ({ tool }: { tool: FreeTool }) => {
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const setValue = (key: string, value: string | number | boolean) => setValues((current) => ({ ...current, [key]: value }));
  const toggle = (key: string) => setChecked((current) => ({ ...current, [key]: !current[key] }));

  const result = useMemo(() => buildToolResult(tool, values, checked), [tool, values, checked]);

  return (
    <div className="space-y-5 rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/70 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">Experiencia interativa</p>
        <h2 className="mt-2 text-2xl font-bold text-[#EDF2F7]">{tool.ctaLabel}</h2>
      </div>

      {tool.toolType === "pricing" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["cidade", "Cidade", "Sao Paulo"],
            ["uf", "UF", "SP"],
            ["meta", "Meta mensal desejada", 8000],
            ["custos", "Custos mensais", 1200],
            ["sessoes", "Sessoes por mes", 80],
            ["faltas", "Margem de faltas (%)", 10],
            ["valorLocal", "Valor medio local opcional", 180],
          ].map(([key, label, placeholder]) => (
            <label key={key} className="space-y-2 text-sm text-[#EDF2F7]">
              {label}
              <input
                type={["cidade", "uf"].includes(String(key)) ? "text" : "number"}
                min={["cidade", "uf"].includes(String(key)) ? undefined : "0"}
                value={String(values[key] ?? "")}
                onChange={(event) =>
                  setValue(String(key), ["cidade", "uf"].includes(String(key)) ? event.target.value : Number(event.target.value))
                }
                className="h-11 w-full rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm outline-none focus:border-[#4ECDC4]"
                placeholder={String(placeholder)}
              />
            </label>
          ))}
        </div>
      ) : tool.toolType === "lgpd" || tool.toolType === "record-checklist" ? (
        <div className="space-y-3">
          {getChecklistItems(tool.toolType).map((item) => (
            <label key={item} className="flex items-start gap-3 rounded-xl border border-[#1A2D42] bg-[#060F1E] p-3 text-sm text-[#B8C7D9]">
              <input type="checkbox" checked={!!checked[item]} onChange={() => toggle(item)} className="mt-1" />
              <span>{item}</span>
            </label>
          ))}
        </div>
      ) : tool.toolType === "weekly-planner" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {["Atendimentos", "Administrativo", "Supervisao", "Estudos", "Financeiro", "Descanso"].map((item) => (
            <label key={item} className="space-y-2 text-sm text-[#EDF2F7]">
              {item}
              <input
                value={String(values[item] ?? "")}
                onChange={(event) => setValue(item, event.target.value)}
                className="h-11 w-full rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm outline-none focus:border-[#4ECDC4]"
                placeholder="Ex.: segunda 9h-12h"
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {getTextFields(tool.toolType).map((field) => (
            <label key={field.key} className="space-y-2 text-sm text-[#EDF2F7]">
              {field.label}
              <input
                value={String(values[field.key] ?? "")}
                onChange={(event) => setValue(field.key, event.target.value)}
                className="h-11 w-full rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm outline-none focus:border-[#4ECDC4]"
                placeholder={field.placeholder}
              />
            </label>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => trackEvent("tool_use", { tool: tool.slug, location: "generate", source: "ethos_tool" })}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F6F73] px-5 py-3 text-sm font-semibold text-white"
      >
        <ArrowRight className="h-4 w-4" />
        {tool.ctaLabel}
      </button>

      <ResultBox title="Rascunho gerado" text={result} tool={tool} />
    </div>
  );
};

const getTextFields = (type: FreeTool["toolType"]) => {
  if (type === "contract") {
    return [
      { key: "profissional", label: "Nome profissional", placeholder: "Dra. Ana Silva" },
      { key: "formato", label: "Formato", placeholder: "Online, presencial ou hibrido" },
      { key: "valor", label: "Valor da sessao", placeholder: "R$ 180" },
      { key: "frequencia", label: "Frequencia", placeholder: "Semanal" },
    ];
  }
  if (type === "absence-policy") {
    return [
      { key: "prazo", label: "Prazo de aviso", placeholder: "24 horas" },
      { key: "cobranca", label: "Regra de cobranca", placeholder: "Faltas sem aviso podem ser cobradas" },
      { key: "atraso", label: "Atrasos", placeholder: "A sessao termina no horario combinado" },
      { key: "canal", label: "Canal de remarcacao", placeholder: "WhatsApp profissional" },
    ];
  }
  return [
    { key: "nome", label: "Nome profissional", placeholder: "Dra. Ana Silva" },
    { key: "publico", label: "Publico/tema", placeholder: "Adultos, ansiedade, carreira..." },
    { key: "abordagem", label: "Abordagem", placeholder: "TCC, psicanalise, humanista..." },
    { key: "contato", label: "Chamada de contato", placeholder: "Agende uma conversa pelo WhatsApp" },
  ];
};

const getChecklistItems = (type: FreeTool["toolType"]) =>
  type === "lgpd"
    ? [
        "Tenho clareza sobre quais dados pessoais coleto e por qual finalidade.",
        "Evito solicitar dados clinicos em formularios publicos.",
        "Separo dados administrativos de registros clinicos.",
        "Uso senhas fortes e controle de acesso nos dispositivos.",
        "Tenho rotina de backup, exportacao ou recuperacao de dados.",
        "Reviso ferramentas externas antes de inserir dados sensiveis.",
      ]
    : [
        "Ficha do paciente com dados cadastrais essenciais.",
        "Queixa principal registrada de forma clara.",
        "Evolucoes organizadas por data.",
        "Documentos e anexos ficam no mesmo fluxo.",
        "Anotacoes de supervisao podem ser revisitadas antes da sessao.",
        "Existe rotina de revisao antes dos atendimentos.",
      ];

const buildToolResult = (tool: FreeTool, values: Record<string, string | number | boolean>, checked: Record<string, boolean>) => {
  if (tool.toolType === "pricing") {
    const cidade = String(values.cidade || "").trim();
    const uf = String(values.uf || "").trim().toUpperCase();
    const meta = Number(values.meta || 0);
    const custos = Number(values.custos || 0);
    const sessoes = Number(values.sessoes || 0);
    const faltas = Number(values.faltas || 0);
    const valorLocal = Number(values.valorLocal || 0);
    const sessoesPagas = Math.max(1, sessoes * (1 - faltas / 100));
    const preco = (meta + custos) / sessoesPagas;
    const comparison =
      valorLocal > 0
        ? `\nComparacao com valor local informado: R$ ${valorLocal.toFixed(2)}\nDiferenca frente ao seu calculo: R$ ${(preco - valorLocal).toFixed(2)}`
        : "\nComparacao local: informe um valor medio praticado na sua cidade/UF se voce tiver uma fonte propria confiavel.";

    return `Referencia financeira com base CFP/FENAPSI\n\nLocal de analise: ${cidade || "[cidade]"}${uf ? `/${uf}` : ""}\nMeta mensal: R$ ${meta.toFixed(2)}\nCustos mensais: R$ ${custos.toFixed(2)}\nSessoes estimadas: ${sessoes || 0}\nMargem de faltas: ${faltas || 0}%\n\nPreco calculado por sessao: R$ ${preco.toFixed(2)}${comparison}\n\nBase oficial: consulte a Tabela de Honorarios CFP/FENAPSI. Ela e uma referencia nacional, nao estabelece piso nem teto obrigatorio. A decisao final deve considerar Codigo de Etica, realidade local, experiencia, publico, impostos, supervisao, estudo e sustentabilidade da pratica.`;
  }

  if (tool.toolType === "lgpd" || tool.toolType === "record-checklist") {
    const items = getChecklistItems(tool.toolType);
    const done = items.filter((item) => checked[item]).length;
    return `Resultado do checklist\n\nItens marcados: ${done}/${items.length}\n\nPontos marcados:\n${items
      .filter((item) => checked[item])
      .map((item) => `- ${item}`)
      .join("\n") || "- Nenhum item marcado ainda."}\n\nProximos pontos para revisar:\n${items
      .filter((item) => !checked[item])
      .map((item) => `- ${item}`)
      .join("\n") || "- Checklist completo."}`;
  }

  if (tool.toolType === "weekly-planner") {
    return `Planejamento semanal\n\nAtendimentos: ${values.Atendimentos || "Defina blocos de sessao"}\nAdministrativo: ${values.Administrativo || "Reserve horario para documentos e mensagens"}\nSupervisao: ${values.Supervisao || "Inclua revisao ou supervisao"}\nEstudos: ${values.Estudos || "Separe tempo de formacao"}\nFinanceiro: ${values.Financeiro || "Revise pagamentos e pendencias"}\nDescanso: ${values.Descanso || "Proteja pausas reais"}\n\nDica: uma agenda saudavel mostra tambem o trabalho invisivel da clinica.`;
  }

  if (tool.toolType === "contract") {
    return `Rascunho de contrato terapeutico\n\nProfissional: ${values.profissional || "[nome profissional]"}\nFormato de atendimento: ${values.formato || "[online/presencial/hibrido]"}\nValor por sessao: ${values.valor || "[valor]"}\nFrequencia: ${values.frequencia || "[frequencia]"}\n\nEste documento registra combinados iniciais sobre atendimento, horarios, pagamento, faltas, remarcacoes, sigilo profissional e canais de comunicacao. O texto deve ser revisado e adaptado antes de uso.`;
  }

  if (tool.toolType === "absence-policy") {
    return `Politica de faltas e remarcacoes\n\nCancelamentos e remarcacoes devem ser comunicados com antecedencia minima de ${values.prazo || "[prazo combinado]"} pelo canal ${values.canal || "[canal combinado]"}.\n\n${values.cobranca || "Faltas sem aviso dentro do prazo combinado podem ser cobradas conforme acordo previo."}\n\nSobre atrasos: ${values.atraso || "a sessao segue ate o horario previamente combinado."}\n\nRevise o texto para adequar ao seu contrato, abordagem e realidade profissional.`;
  }

  return `Bio profissional\n\n${values.nome || "[Seu nome profissional]"} atende ${values.publico || "[publico ou tema principal]"} com base em ${values.abordagem || "[abordagem ou linha de trabalho]"}.\n\nAqui voce encontra um espaco de escuta profissional, com combinados claros e acolhimento responsavel.\n\n${values.contato || "Para saber mais, entre em contato pelo WhatsApp profissional."}\n\nEvite promessas de cura ou resultado individual.`;
};

const ToolPage = () => {
  const { slug } = useParams();
  const tool = findFreeTool(slug);

  useSeo({
    title: tool ? tool.seoTitle : "Ferramentas ETHOS",
    description: tool?.description ?? "Ferramentas gratuitas para psicologas e psicologos.",
    path: tool ? `/ferramentas/${tool.slug}` : "/ferramentas",
    jsonLd: [
      organizationSchema,
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Ferramentas", path: "/ferramentas" },
        ...(tool ? [{ name: tool.title, path: `/ferramentas/${tool.slug}` }] : []),
      ]),
      ...(tool?.faq?.length ? [faqSchema(tool.faq)] : []),
    ],
  });

  if (!tool || !slug) return <Navigate to="/ferramentas" replace />;

  const biohubHref = tool.secondaryCtaHref ?? (tool.toolType === "bio-generator" ? BIOHUB_REGISTER_URL : undefined);

  return (
    <div className="min-h-screen" style={{ background: "#060F1E" }}>
      <Header />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-28">
        <Link to="/ferramentas" className="text-sm text-[#4ECDC4] hover:underline">
          Voltar para ferramentas
        </Link>

        <section className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">{tool.eyebrow}</span>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-[#EDF2F7] md:text-6xl">{tool.heroTitle}</h1>
            <p className="mt-5 text-lg leading-8 text-[#6B8FA8]">{tool.heroText}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {tool.highlights.map((highlight) => (
                <span key={highlight} className="rounded-full border border-[#1A2D42] px-3 py-1 text-xs text-[#8EA9BD]">
                  {highlight}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={APP_URL}
                onClick={() => trackEvent("cta_app_click", { location: "tool_page", tool: tool.slug })}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2F6F73] px-5 py-3 text-sm font-semibold text-white"
              >
                Testar ETHOS <ArrowRight className="h-4 w-4" />
              </a>
              {biohubHref ? (
                <a
                  href={biohubHref}
                  onClick={() => trackEvent("biohub_click", { location: "tool_page", tool: tool.slug })}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#1A2D42] px-5 py-3 text-sm font-semibold text-[#EDF2F7]"
                >
                  {tool.secondaryCtaLabel ?? "Conhecer BioHub"} <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>

          <ToolExperience tool={tool} />
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_0.7fr]">
          <div className="space-y-6">
            <ReferencePanel tool={tool} />
            <div className="rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/55 p-6">
              <h2 className="text-2xl font-bold text-[#EDF2F7]">Cuidados de uso</h2>
              <p className="mt-4 text-sm leading-7 text-[#B8C7D9]">
                Esta ferramenta e educativa e administrativa. Ela nao substitui julgamento profissional, supervisao,
                orientacao juridica ou revisao de documentos. Nao insira nomes, queixas ou dados clinicos de pacientes.
              </p>
            </div>
          </div>
          <ToolLeadForm tool={tool} />
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-[#EDF2F7]">Perguntas frequentes</h2>
          <div className="mt-5 divide-y divide-[#1A2D42] rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/55">
            {tool.faq.map((item) => (
              <div key={item.q} className="p-5">
                <h3 className="text-base font-semibold text-[#EDF2F7]">{item.q}</h3>
                <p className="mt-2 text-sm leading-7 text-[#8EA9BD]">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ToolPage;
