import React, { useState, useCallback, useEffect } from "react";

const sectionStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: "#111827",
  color: "#F9FAFB",
  marginBottom: 16,
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  background: "#3B82F6",
  color: "white",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#475569",
};

const outlineButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  border: "1px solid #475569",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #1F2937",
  background: "#0B1120",
  color: "#E2E8F0",
  width: "100%",
};

const subtleText: React.CSSProperties = { color: "#94A3B8" };

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#1E293B",
  color: "#E2E8F0",
  fontSize: 12,
};

export const FinancialSection = ({ patients, financialEntries, refreshData }: any) => (
  <section>
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Gestão Financeira</h2>
        <div style={badgeStyle}>V1 Clinical</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          style={buttonStyle}
          onClick={async () => {
            const pId = prompt("ID do Paciente (cole aqui):");
            if (!pId) return;
            const amount = prompt("Valor (em reais, ex: 150.00):");
            if (!amount) return;
            if (window.ethos?.financial) {
              await window.ethos.financial.create({
                patientId: pId,
                amount: Math.round(parseFloat(amount) * 100),
                type: "charge",
                category: "session",
                status: "pending",
                date: new Date().toISOString()
              });
              refreshData();
            }
          }}
        >
          + Nova Cobrança
        </button>
        <button
          style={{ ...buttonStyle, background: "#10B981" }}
          onClick={async () => {
            const pId = prompt("ID do Paciente (cole aqui):");
            if (!pId) return;
            const amount = prompt("Valor (em reais, ex: 150.00):");
            if (!amount) return;
            if (window.ethos?.financial) {
              await window.ethos.financial.create({
                patientId: pId,
                amount: Math.round(parseFloat(amount) * 100),
                type: "payment",
                category: "session",
                status: "completed",
                method: "pix",
                date: new Date().toISOString()
              });
              refreshData();
            }
          }}
        >
          + Registrar Pagamento
        </button>
        <button
          style={{ ...buttonStyle, background: "#8B5CF6" }}
          onClick={async () => {
            const pId = prompt("ID do Paciente:");
            if (!pId) return;
            const sessions = prompt("Quantidade de sessões no pacote (ex: 10):");
            if (!sessions) return;
            const total = prompt("Valor total do pacote (ex: 1200.00):");
            if (!total) return;

            if (window.ethos?.financial) {
              await window.ethos.financial.create({
                patientId: pId,
                amount: Math.round(parseFloat(total) * 100),
                type: "charge",
                category: "package",
                status: "pending",
                notes: `Pacote de ${sessions} sessões`,
                date: new Date().toISOString()
              });
              refreshData();
            }
          }}
        >
          + Novo Pacote
        </button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {financialEntries.length === 0 ? (
          <p style={subtleText}>Nenhum registro financeiro.</p>
        ) : (
          financialEntries.map((e: any) => {
            const p = patients.find((patient: any) => patient.id === e.patientId);
            return (
              <div
                key={e.id}
                style={{
                  background: "#0B1120",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #1E293B",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                                <strong style={{ color: e.type === "payment" ? "#10B981" : "#FBBF24" }}>
                                  {e.type === "payment" ? "PAGAMENTO" : "COBRANÇA"}
                                </strong>
                                {e.category === "package" && <span style={{ ...badgeStyle, fontSize: 9 }}>PACOTE</span>}
                              </div>
                  <p style={{ color: "#E2E8F0", fontSize: 14 }}>{p?.fullName || "Desconhecido"}</p>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <p style={{ ...subtleText, fontSize: 12 }}>{new Date(e.date).toLocaleDateString("pt-BR")}</p>
                                {e.notes && <p style={{ ...subtleText, fontSize: 11, fontStyle: "italic" }}>• {e.notes}</p>}
                              </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 18, fontWeight: 700 }}>R$ {(e.amount / 100).toFixed(2)}</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                    {e.type === "payment" && (
                      <button
                        style={{ ...outlineButtonStyle, padding: "2px 8px", fontSize: 10 }}
                        onClick={async () => {
                          if (window.ethos?.genai) {
                            const recibo = await window.ethos.genai.generateRecibo({
                              patientId: e.patientId,
                              amount: e.amount,
                              date: e.date
                            });
                            if (window.ethos?.export) {
                              await window.ethos.export.pdf(recibo, `Recibo_${p?.fullName}_${new Date(e.date).toISOString().split('T')[0]}`);
                            }
                          }
                        }}
                      >
                        Recibo PDF
                      </button>
                    )}
                    <span style={{ ...badgeStyle, background: e.status === "completed" ? "#064E3B" : "#451A03" }}>
                      {e.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </section>
);

export const DiariesSection = ({ patients, formTemplates, selectedPatientId, setSelectedPatientId }: any) => (
  <section>
    <div style={sectionStyle}>
      <h2>Diários e Formulários</h2>
      <p style={subtleText}>Acompanhe a evolução do paciente entre as sessões.</p>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "250px 1fr", gap: 24 }}>
        <div style={{ background: "#0B1120", padding: 16, borderRadius: 12, border: "1px solid #1E293B" }}>
          <h4 style={{ marginTop: 0 }}>Pacientes</h4>
          <div style={{ display: "grid", gap: 8 }}>
            {patients.map((p: any) => (
              <button
                key={p.id}
                style={{
                  ...outlineButtonStyle,
                  textAlign: "left",
                  background: selectedPatientId === p.id ? "#1E293B" : "transparent",
                  borderColor: selectedPatientId === p.id ? "#3B82F6" : "#1E293B"
                }}
                onClick={() => setSelectedPatientId(p.id)}
              >
                {p.fullName}
              </button>
            ))}
          </div>
        </div>

        <div>
          {!selectedPatientId ? (
            <p style={subtleText}>Selecione um paciente para ver as respostas.</p>
          ) : (
            <PatientDiariesView patientId={selectedPatientId} templates={formTemplates} />
          )}
        </div>
      </div>
    </div>
  </section>
);

function PatientDiariesView({ patientId, templates }: { patientId: string; templates: any[] }) {
  const [responses, setResponses] = useState<any[]>([]);

  const loadResponses = useCallback(async () => {
    if (window.ethos?.forms) {
      const res = await window.ethos.forms.getResponses(patientId);
      setResponses(res || []);
    }
  }, [patientId]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Histórico de Respostas</h3>
        <div style={{ display: "flex", gap: 12 }}>
          {templates.map(t => (
            <button
              key={t.id}
              style={{ ...buttonStyle, padding: "6px 12px", fontSize: 12 }}
              onClick={async () => {
                const schema = JSON.parse(t.schema);
                const answers: any = {};
                for (const field of schema) {
                  const val = prompt(field.question);
                  if (val === null) return;
                  answers[field.id] = val;
                }
                await window.ethos.forms.submitResponse({
                  formId: t.id,
                  patientId,
                  answers
                });
                loadResponses();
              }}
            >
              + {t.title}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {responses.length === 0 ? (
          <p style={{ color: "#94A3B8" }}>Nenhuma resposta registrada ainda.</p>
        ) : (
          responses.map(r => {
            const answers = JSON.parse(r.answers);
            return (
              <div key={r.id} style={{ background: "#0B1120", padding: 16, borderRadius: 12, border: "1px solid #1E293B" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <strong style={{ color: "#3B82F6" }}>{r.formTitle}</strong>
                  <span style={{ fontSize: 12, color: "#64748B" }}>{new Date(r.createdAt).toLocaleString("pt-BR")}</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.entries(answers).map(([key, val]: [string, any]) => (
                    <div key={key}>
                      <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>Pergunta ID: {key}</p>
                      <p style={{ margin: 0, color: "#E2E8F0" }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export const ReportsSection = ({
  reportType, setReportType, selectedSessionId, currentPatient, currentSession, clinicianName, status, draft, validatedAt
}: any) => (
  <section>
    <div style={sectionStyle}>
      <h2>Geração de Documentos</h2>
      <p style={subtleText}>Gere documentos oficiais com base nos dados clínicos.</p>

      <div style={{ marginTop: 16, display: "grid", gap: 16, maxWidth: 400 }}>
        <label style={{ display: "grid", gap: 8 }}>
          Tipo de Documento
          <select
            style={inputStyle}
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
          >
            <option value="declaration">Declaração de Comparecimento</option>
            <option value="clinical_report">Relatório Psicológico (baseado em nota validada)</option>
          </select>
        </label>

        {reportType === "declaration" ? (
          <div>
            <p style={{ ...subtleText, fontSize: 14, marginBottom: 12 }}>
              Gera uma declaração simples confirmando a presença do paciente na sessão selecionada.
            </p>
            <button
              style={buttonStyle}
              disabled={!selectedSessionId}
              onClick={async () => {
                if (!currentPatient || !currentSession) return;
                const text = `DECLARAÇÃO DE COMPARECIMENTO\n\nDeclaro para os devidos fins que o(a) paciente ${currentPatient.fullName} compareceu à sessão de psicoterapia no dia ${new Date(currentSession.scheduledAt).toLocaleDateString("pt-BR")}.\n\nEmitido em: ${new Date().toLocaleDateString("pt-BR")}\n\nResponsável: ${clinicianName}`;
                if (window.ethos?.export) {
                  await window.ethos.export.pdf(text, `Declaracao_${currentPatient.fullName}`);
                }
              }}
            >
              Gerar PDF
            </button>
            {!selectedSessionId && <p style={{ color: "#FBBF24", fontSize: 12, marginTop: 8 }}>Selecione uma sessão na Agenda primeiro.</p>}
          </div>
        ) : (
          <div>
            <p style={{ ...subtleText, fontSize: 14, marginBottom: 12 }}>
              Gera um relatório clínico detalhado baseado no prontuário VALIDADO da sessão selecionada.
            </p>
            <button
              style={buttonStyle}
              disabled={!selectedSessionId || status !== "validated"}
              onClick={async () => {
                if (!currentPatient || !currentSession || status !== "validated") return;
                const text = `RELATÓRIO PSICOLÓGICO\n\nIDENTIFICAÇÃO\nPaciente: ${currentPatient.fullName}\nProfissional: ${clinicianName}\nData da Sessão: ${new Date(currentSession.scheduledAt).toLocaleDateString("pt-BR")}\n\nDESCRIÇÃO E EVOLUÇÃO\n${draft}\n\nDocumento validado eletronicamente em ${validatedAt}.`;
                if (window.ethos?.export) {
                  await window.ethos.export.pdf(text, `Relatorio_${currentPatient.fullName}`);
                }
              }}
            >
              Gerar PDF (Relatório)
            </button>
            {(!selectedSessionId || status !== "validated") && (
              <p style={{ color: "#FBBF24", fontSize: 12, marginTop: 8 }}>
                Requer uma sessão selecionada e um prontuário VALIDADO.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  </section>
);

export const ConfigSection = ({ whatsappTemplate, setWhatsappTemplate, refreshData }: any) => (
  <section>
    <div style={sectionStyle}>
      <h2>Segurança e Backup</h2>
      <p style={subtleText}>Gerencie a integridade e o backup dos seus dados clínicos.</p>

      <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
        <div>
          <strong>Lembrete WhatsApp (Template)</strong>
          <p style={{ ...subtleText, fontSize: 14, marginBottom: 8 }}>Use {{nome}}, {{data}} e {{hora}} como variáveis.</p>
          <textarea
            style={{ ...inputStyle, minHeight: 80, fontSize: 14 }}
            value={whatsappTemplate}
            onChange={(e) => setWhatsappTemplate(e.target.value)}
          />
        </div>

        <div style={{ borderTop: "1px solid #1E293B", paddingTop: 16 }}>
          <strong>Backup Local</strong>
          <p style={{ ...subtleText, fontSize: 14, marginBottom: 8 }}>Cria uma cópia criptografada do banco de dados.</p>
          <button
            style={buttonStyle}
            onClick={async () => {
              const pwd = prompt("Defina uma senha para o arquivo de backup:");
              if (pwd && window.ethos?.backup) {
                const ok = await window.ethos.backup.create(pwd);
                if (ok) alert("Backup concluído com sucesso!");
              }
            }}
          >
            Criar Backup
          </button>
        </div>

        <div style={{ borderTop: "1px solid #1E293B", paddingTop: 16 }}>
          <strong>Restaurar Backup</strong>
          <p style={{ ...subtleText, fontSize: 14, marginBottom: 8 }}>Substitui o banco de dados atual por um backup.</p>
          <button
            style={secondaryButtonStyle}
            onClick={async () => {
              const pwd = prompt("Digite a senha do arquivo de backup:");
              if (pwd && window.ethos?.backup) {
                const ok = await window.ethos.backup.restore(pwd);
                if (ok) alert("Restauração concluída! Reinicie o aplicativo.");
              }
            }}
          >
            Restaurar Backup
          </button>
        </div>

        <div style={{ borderTop: "1px solid #1E293B", paddingTop: 16 }}>
          <strong>Limpeza de Dados (Purge)</strong>
          <p style={{ ...subtleText, fontSize: 14, marginBottom: 8 }}>Apaga todos os dados locais permanentemente.</p>
          <button
            style={{ ...buttonStyle, background: "#EF4444" }}
            onClick={async () => {
              if (confirm("TEM CERTEZA? Isso apagará todos os pacientes, sessões e áudios.") && window.ethos?.privacy) {
                await window.ethos.privacy.purgeAll();
                refreshData();
                alert("Todos os dados foram apagados.");
              }
            }}
          >
            Apagar Tudo
          </button>
        </div>
      </div>
    </div>
  </section>
);
