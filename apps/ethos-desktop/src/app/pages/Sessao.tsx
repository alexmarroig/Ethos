import React, { useEffect, useMemo, useState } from "react";
import { TranscriptionService, type TranscriptionResult } from "../../services/transcriptionService";

type TemplateField = { id: string; label: string; required?: boolean };
type TemplateSection = { id: string; label: string; placeholder?: string };
type DocumentTemplate = {
  id: string;
  authority: "CFP" | "CRP";
  title: string;
  description: string;
  type: "laudo" | "relatorio" | "declaracao";
  globalFields: TemplateField[];
  sections: TemplateSection[];
};

type SafeModeAlert = { id: string; message: string; match: string };
type DocumentVersion = {
  id: string;
  version: number;
  createdAt: string;
  content: string;
  globalValues: Record<string, string>;
  alerts: SafeModeAlert[];
};

const SAFE_MODE_RULES: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bdiagn[oó]stic\w*/i, message: "Evite linguagem diagnóstica conclusiva fora do laudo." },
  { pattern: /\btranstorno\b/i, message: "Substitua termos diagnósticos por descrições clínicas." },
  { pattern: /\bCID-?\s*\w+/i, message: "Códigos CID devem aparecer apenas em laudos." },
  { pattern: /\bconclusiv\w+/i, message: "Evite termos conclusivos em declarações." },
  { pattern: /\bcomprovad\w+/i, message: "Evite afirmações conclusivas sem laudo." },
];

const buildSafeModeAlerts = (content: string, allowDiagnostics: boolean) => {
  if (allowDiagnostics) return [];
  return SAFE_MODE_RULES.flatMap((rule) => {
    const match = content.match(rule.pattern);
    if (!match) return [];
    return [{ id: `${rule.pattern.source}-${match.index ?? 0}`, message: rule.message, match: match[0] }];
  });
};

const documentTemplates: DocumentTemplate[] = [
  {
    id: "cfp-atestado",
    authority: "CFP",
    title: "Atestado psicológico CFP",
    description: "Declaração breve com identificação profissional e objetivo da emissão.",
    type: "declaracao",
    globalFields: [
      { id: "profissional_nome", label: "Nome do(a) profissional", required: true },
      { id: "registro_profissional", label: "Registro profissional (CRP)", required: true },
      { id: "paciente_nome", label: "Nome do(a) paciente", required: true },
      { id: "data_emissao", label: "Data de emissão", required: true },
    ],
    sections: [
      { id: "objetivo", label: "Objetivo do documento", placeholder: "Informe a finalidade do atestado." },
      { id: "periodo", label: "Período/comparecimento", placeholder: "Descreva período de acompanhamento ou comparecimento." },
      { id: "observacoes", label: "Observações", placeholder: "Informações complementares, sem diagnóstico conclusivo." },
    ],
  },
  {
    id: "crp-declaracao",
    authority: "CRP",
    title: "Declaração CRP",
    description: "Declaração de acompanhamento com dados básicos e limites éticos.",
    type: "declaracao",
    globalFields: [
      { id: "profissional_nome", label: "Nome do(a) profissional", required: true },
      { id: "registro_profissional", label: "Registro profissional (CRP)", required: true },
      { id: "paciente_nome", label: "Nome do(a) paciente", required: true },
      { id: "cidade_uf", label: "Cidade/UF", required: true },
      { id: "data_emissao", label: "Data de emissão", required: true },
    ],
    sections: [
      { id: "contexto", label: "Contexto do acompanhamento", placeholder: "Descreva o contexto sem linguagem diagnóstica." },
      { id: "objetivo", label: "Objetivo da declaração", placeholder: "Informe para qual finalidade a declaração é emitida." },
      { id: "limites", label: "Limites e observações", placeholder: "Registre limites técnicos e éticos do documento." },
    ],
  },
];

export const Sessao = () => {
  const [consent, setConsent] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState("idle");
  const [jobProgress, setJobProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptionResult["transcript"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [safeMode, setSafeMode] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(documentTemplates[0]?.id ?? "");
  const [globalValues, setGlobalValues] = useState<Record<string, string>>({});
  const [documentContent, setDocumentContent] = useState("");
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const sessionId = "sessao-marina-001";
  const transcriptionService = useMemo(() => new TranscriptionService(), []);
  const selectedTemplate = useMemo(
    () => documentTemplates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId],
  );
  const safeModeAlerts = useMemo(() => {
    if (!safeMode || !selectedTemplate) return [];
    return buildSafeModeAlerts(documentContent, selectedTemplate.type === "laudo");
  }, [documentContent, safeMode, selectedTemplate]);
  const prontuarioTimeline = useMemo(
    () => [
      {
        id: "sessao-001",
        label: "Sessão 01 · 12/08/2024",
        occurredAt: "2024-08-12T14:00:00Z",
        themes: {
          sono: {
            label: "Sono",
            registro_factual: [
              "Relatou dormir 4-5 horas por noite, com despertares às 03h.",
              "Registrou uso de cafeína após 18h.",
            ],
            impressoes: [
              "Percepção de sono superficial associada à rotina de trabalho.",
              "Reconhece impacto do cansaço na concentração diurna.",
            ],
            planejamento: ["Combinar registro diário de horários de sono.", "Revisar hábitos noturnos na próxima sessão."],
          },
          trabalho: {
            label: "Trabalho",
            registro_factual: ["Descreveu aumento de demandas no setor nas últimas 2 semanas."],
            impressoes: ["Sinaliza sobrecarga e dificuldade de delegar."],
            planejamento: ["Mapear tarefas críticas e pontos de apoio com a equipe."],
          },
        },
      },
      {
        id: "sessao-002",
        label: "Sessão 02 · 19/08/2024",
        occurredAt: "2024-08-19T14:00:00Z",
        themes: {
          sono: {
            label: "Sono",
            registro_factual: ["Apresentou diário de sono com média de 6 horas.", "Relatou redução de cafeína após 17h."],
            impressoes: ["Percebe melhora leve na disposição matinal."],
            planejamento: ["Manter diário e testar rotina de relaxamento de 10 minutos."],
          },
          autocuidado: {
            label: "Autocuidado",
            registro_factual: ["Listou caminhadas curtas em 3 dias da semana."],
            impressoes: ["Relatou sensação de alívio após as caminhadas."],
            planejamento: ["Registrar horários e sensação corporal após a atividade."],
          },
        },
      },
    ],
    []
  );
  const themeOptions = useMemo(() => {
    const options = new Map<string, { id: string; label: string }>();
    prontuarioTimeline.forEach((session) => {
      Object.entries(session.themes).forEach(([id, theme]) => {
        options.set(id, { id, label: theme.label });
      });
    });
    return Array.from(options.values());
  }, [prontuarioTimeline]);
  const [selectedThemeId, setSelectedThemeId] = useState(themeOptions[0]?.id ?? "");
  const [selectedSessionId, setSelectedSessionId] = useState(prontuarioTimeline[0]?.id ?? "");

  useEffect(() => {
    if (!selectedThemeId && themeOptions.length > 0) {
      setSelectedThemeId(themeOptions[0].id);
    }
    if (!selectedSessionId && prontuarioTimeline.length > 0) {
      setSelectedSessionId(prontuarioTimeline[0].id);
    }
  }, [prontuarioTimeline, selectedSessionId, selectedThemeId, themeOptions]);

  useEffect(() => {
    transcriptionService.onJobUpdate((job) => {
      if (job.sessionId !== sessionId) {
        return;
      }
      setJobId(job.id);
      setJobStatus(job.status);
      setJobProgress(job.progress);
      if (job.status === "failed") {
        setErrorMessage(job.error ?? "Falha ao transcrever.");
      }
    });
    transcriptionService.onJobResult((result) => {
      if (result.jobId !== jobId) {
        return;
      }
      setTranscript(result.transcript);
      setJobStatus("completed");
    });
    transcriptionService.onJobError((error) => {
      if (error.jobId !== jobId) {
        return;
      }
      setErrorMessage(error.error);
      setJobStatus("failed");
    });
  }, [jobId, sessionId, transcriptionService]);

  const handlePickAudio = async () => {
    const path = await transcriptionService.pickAudio();
    if (path) {
      setAudioPath(path);
      setTranscript(null);
      setErrorMessage(null);
      setJobStatus("idle");
      setJobProgress(0);
    }
  };

  const handleTranscribe = async () => {
    if (!audioPath) {
      setErrorMessage("Selecione um áudio primeiro.");
      return;
    }
    if (!consent) {
      setErrorMessage("Confirme o consentimento antes de transcrever.");
      return;
    }
    setErrorMessage(null);
    setJobStatus("queued");
    const newJobId = await transcriptionService.enqueueTranscription(sessionId, audioPath, "ptbr-accurate");
    if (newJobId) {
      setJobId(newJobId);
    }
  };

  const handleGlobalFieldChange = (fieldId: string, value: string) => {
    setGlobalValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSaveVersion = () => {
    if (!selectedTemplate) return;
    const nextVersion = versions.length + 1;
    setVersions((prev) => [
      {
        id: `${selectedTemplate.id}-${nextVersion}`,
        version: nextVersion,
        createdAt: new Date().toLocaleString("pt-BR"),
        content: documentContent,
        globalValues,
        alerts: safeModeAlerts,
      },
      ...prev,
    ]);
  };
  const activeSession = prontuarioTimeline.find((session) => session.id === selectedSessionId) ?? prontuarioTimeline[0];
  const activeTheme = activeSession?.themes[selectedThemeId];
  const fallbackTheme = themeOptions[0]?.id;
  const themeToRender = activeTheme ?? activeSession?.themes[fallbackTheme ?? ""];
  const timelineItems = activeSession ? [
    { label: "Registro factual", items: themeToRender?.registro_factual ?? [] },
    { label: "Impressões", items: themeToRender?.impressoes ?? [] },
    { label: "Planejamento", items: themeToRender?.planejamento ?? [] },
  ] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Sessão em andamento</h2>
        <p style={{ color: "#94A3B8" }}>Fluxo offline com captura e validação.</p>
      </header>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <p>Paciente: Marina Alves</p>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            type="button"
            onClick={handlePickAudio}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#3B82F6",
              color: "white",
              cursor: "pointer",
            }}
          >
            Importar áudio
          </button>
          <button
            type="button"
            onClick={handleTranscribe}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#475569",
              color: "white",
              cursor: "pointer",
            }}
          >
            Transcrever áudio
          </button>
        </div>
        {audioPath ? (
          <p style={{ color: "#CBD5F5", marginTop: 8, fontSize: 12 }}>Arquivo selecionado: {audioPath}</p>
        ) : (
          <p style={{ color: "#94A3B8", marginTop: 8, fontSize: 12 }}>Selecione um áudio (.mp3, .wav, .m4a) para transcrição.</p>
        )}
        <label style={{ display: "block", marginTop: 12, color: "#E2E8F0" }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />{" "}
          Tenho consentimento do paciente
        </label>
        <p style={{ color: "#94A3B8", marginTop: 8 }}>
          Status da transcrição: {jobStatus} · progresso {Math.round(jobProgress * 100)}%
        </p>
        {errorMessage ? (
          <p style={{ color: "#FCA5A5", marginTop: 8 }}>{errorMessage}</p>
        ) : null}
        {transcript ? (
          <div style={{ marginTop: 12, padding: 12, background: "#0B1220", borderRadius: 12 }}>
            <p style={{ marginTop: 0, marginBottom: 8, color: "#E2E8F0" }}>
              Transcrição ({transcript.language ?? "pt"}):
            </p>
            <p style={{ color: "#CBD5F5", whiteSpace: "pre-wrap" }}>{transcript.fullText}</p>
          </div>
        ) : null}
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Documentos CFP/CRP</h3>
            <p style={{ color: "#94A3B8", marginTop: 0 }}>
              Template, campos globais e editor vinculados ao caso {sessionId}.
            </p>
          </div>
          <label style={{ color: "#E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={safeMode}
              onChange={(event) => setSafeMode(event.target.checked)}
            />
            Modo seguro
          </label>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 280px) 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ background: "#0B1220", padding: 16, borderRadius: 12 }}>
            <p style={{ marginTop: 0, color: "#CBD5F5", fontWeight: 600 }}>Templates</p>
            {documentTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  marginBottom: 8,
                  borderRadius: 10,
                  border: "none",
                  background: template.id === selectedTemplateId ? "#1D4ED8" : "#111827",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <strong>{template.authority}</strong> · {template.title}
                <span style={{ display: "block", color: "#CBD5F5", fontSize: 12, marginTop: 4 }}>
                  {template.description}
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#0B1220", padding: 16, borderRadius: 12 }}>
              <p style={{ marginTop: 0, color: "#CBD5F5", fontWeight: 600 }}>Campos globais</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {selectedTemplate?.globalFields.map((field) => (
                  <label key={field.id} style={{ color: "#E2E8F0", fontSize: 13 }}>
                    {field.label}
                    <input
                      type="text"
                      value={globalValues[field.id] ?? ""}
                      onChange={(event) => handleGlobalFieldChange(field.id, event.target.value)}
                      placeholder={field.required ? "Obrigatório" : "Opcional"}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 6,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #1E293B",
                        background: "#111827",
                        color: "white",
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div style={{ background: "#0B1220", padding: 16, borderRadius: 12 }}>
              <p style={{ marginTop: 0, color: "#CBD5F5", fontWeight: 600 }}>Editor do documento</p>
              <textarea
                value={documentContent}
                onChange={(event) => setDocumentContent(event.target.value)}
                placeholder={selectedTemplate?.sections.map((section) => `• ${section.label}`).join("\n")}
                style={{
                  width: "100%",
                  minHeight: 160,
                  borderRadius: 10,
                  border: "1px solid #1E293B",
                  padding: 12,
                  background: "#111827",
                  color: "white",
                  resize: "vertical",
                }}
              />
              {safeMode && safeModeAlerts.length > 0 ? (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#1F2937", color: "#FCA5A5" }}>
                  <strong>Alertas do modo seguro</strong>
                  <ul style={{ margin: "8px 0 0 16px" }}>
                    {safeModeAlerts.map((alert) => (
                      <li key={alert.id}>
                        {alert.message} (<span style={{ color: "#FBBF24" }}>{alert.match}</span>)
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleSaveVersion}
                style={{
                  marginTop: 12,
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "#22C55E",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Salvar versão
              </button>
            </div>
            <div style={{ background: "#0B1220", padding: 16, borderRadius: 12 }}>
              <p style={{ marginTop: 0, color: "#CBD5F5", fontWeight: 600 }}>Histórico de versões</p>
              {versions.length === 0 ? (
                <p style={{ color: "#94A3B8" }}>Nenhuma versão salva ainda.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {versions.map((version) => (
                    <li
                      key={version.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #1E293B",
                        marginBottom: 8,
                      }}
                    >
                      <strong>Versão {version.version}</strong> · {version.createdAt}
                      <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>
                        Campos globais preenchidos: {Object.keys(version.globalValues).length}
                      </div>
                      {version.alerts.length > 0 ? (
                        <div style={{ color: "#FCA5A5", fontSize: 12, marginTop: 6 }}>
                          {version.alerts.length} alerta(s) de linguagem conclusiva registrados
                        </div>
                      ) : (
                        <div style={{ color: "#86EFAC", fontSize: 12, marginTop: 6 }}>
                          Sem alertas de modo seguro
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
      <section style={{ background: "#0F172A", padding: 20, borderRadius: 16 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h3 style={{ margin: 0 }}>Prontuário estruturado</h3>
          <p style={{ margin: 0, color: "#94A3B8", fontSize: 14 }}>
            A IA apenas organiza as informações da sessão, sem inferências adicionais.
          </p>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, marginTop: 16 }}>
          <aside style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ color: "#CBD5F5", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Temas</p>
            {themeOptions.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedThemeId(theme.id)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid",
                  borderColor: selectedThemeId === theme.id ? "#38BDF8" : "#1F2937",
                  background: selectedThemeId === theme.id ? "#0B4A6F" : "#111827",
                  color: "#E2E8F0",
                  cursor: "pointer",
                }}
              >
                {theme.label}
              </button>
            ))}
          </aside>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {prontuarioTimeline.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: selectedSessionId === session.id ? "#22D3EE" : "#1F2937",
                    background: selectedSessionId === session.id ? "#134E4A" : "#0B1220",
                    color: "#E2E8F0",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {session.label}
                </button>
              ))}
            </div>
            <div style={{ background: "#111827", borderRadius: 16, padding: 16 }}>
              <p style={{ margin: 0, color: "#93C5FD", fontSize: 12 }}>
                Timeline da sessão · {activeSession?.label ?? "Selecione uma sessão"}
              </p>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {timelineItems.map((section) => (
                  <div key={section.label} style={{ background: "#0B1220", borderRadius: 12, padding: 12 }}>
                    <p style={{ margin: 0, color: "#E2E8F0", fontWeight: 600 }}>{section.label}</p>
                    {section.items.length > 0 ? (
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#CBD5F5" }}>
                        {section.items.map((item, index) => (
                          <li key={`${section.label}-${index}`} style={{ marginBottom: 6 }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: "8px 0 0", color: "#94A3B8", fontSize: 12 }}>
                        Nenhum registro disponível para este tema.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
