import React, { useEffect, useMemo, useState } from "react";
import { formsService, type FormDefinition, type FormEntry } from "../../../services/formsService";
import { usePatientAuth } from "../../auth/PatientAuthContext";

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0F172A",
  color: "#E2E8F0",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const cardStyle: React.CSSProperties = {
  background: "#111827",
  padding: 20,
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #1F2937",
  background: "#0F172A",
  color: "#E2E8F0",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#38BDF8",
  color: "#0F172A",
  fontWeight: 600,
  cursor: "pointer",
};

export const PatientPortal = () => {
  const { patient, logout } = usePatientAuth();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [answers, setAnswers] = useState<Record<string, Record<string, string | number | boolean>>>(
    {}
  );

  const refresh = () => {
    if (!patient) {
      return;
    }
    const availableForms = formsService
      .listForms()
      .filter((form) => form.active && form.assignedPatientIds.includes(patient.id));
    setForms(availableForms);
    setEntries(formsService.listEntriesByPatient(patient.id));
  };

  useEffect(() => {
    refresh();
  }, [patient]);

  const handleChangeAnswer = (
    formId: string,
    questionId: string,
    value: string | number | boolean
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [formId]: {
        ...(prev[formId] ?? {}),
        [questionId]: value,
      },
    }));
  };

  const handleSubmit = (formId: string) => {
    if (!patient) {
      return;
    }
    const payload = answers[formId] ?? {};
    if (Object.keys(payload).length === 0) {
      return;
    }
    formsService.createEntry({
      formId,
      patientId: patient.id,
      answers: payload,
    });
    setAnswers((prev) => ({ ...prev, [formId]: {} }));
    refresh();
  };

  const historyByForm = useMemo(() => {
    return forms.reduce<Record<string, FormEntry[]>>((acc, form) => {
      acc[form.id] = entries.filter((entry) => entry.formId === form.id);
      return acc;
    }, {});
  }, [entries, forms]);

  return (
    <div style={containerStyle}>
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Olá, {patient?.name}</h2>
            <p style={{ margin: 0, color: "#94A3B8" }}>
              Responda aos formulários autorizados e acompanhe seu histórico.
            </p>
          </div>
          <button type="button" style={buttonStyle} onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <section style={cardStyle}>
        <h3 style={{ margin: 0 }}>Formulários disponíveis</h3>
        {forms.length === 0 ? (
          <p style={{ margin: 0, color: "#94A3B8", fontSize: 13 }}>
            Nenhum formulário liberado no momento. Aguarde novas orientações do seu psicólogo.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {forms.map((form) => (
              <div key={form.id} style={{ border: "1px solid #1F2937", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>{form.title}</strong>
                    {form.description ? (
                      <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 12 }}>{form.description}</p>
                    ) : null}
                  </div>
                  <span style={{ fontSize: 12, color: "#38BDF8" }}>
                    {form.kind === "diary" ? "Diário" : "Formulário"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  {form.questions.map((question) => {
                    const value = answers[form.id]?.[question.id] ?? "";
                    if (question.type === "boolean") {
                      return (
                        <label key={question.id} style={{ fontSize: 13, color: "#CBD5F5" }}>
                          {question.label}
                          <select
                            style={{ ...inputStyle, marginTop: 6 }}
                            value={String(value)}
                            onChange={(event) =>
                              handleChangeAnswer(form.id, question.id, event.target.value === "true")
                            }
                          >
                            <option value="">Selecione</option>
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        </label>
                      );
                    }
                    if (question.type === "scale") {
                      return (
                        <label key={question.id} style={{ fontSize: 13, color: "#CBD5F5" }}>
                          {question.label}
                          <input
                            style={{ ...inputStyle, marginTop: 6 }}
                            type="number"
                            min={1}
                            max={5}
                            value={typeof value === "number" || typeof value === "string" ? value : ""}
                            onChange={(event) =>
                              handleChangeAnswer(form.id, question.id, Number(event.target.value))
                            }
                          />
                        </label>
                      );
                    }
                    if (question.type === "diary") {
                      return (
                        <label key={question.id} style={{ fontSize: 13, color: "#CBD5F5" }}>
                          {question.label}
                          <textarea
                            style={{ ...inputStyle, marginTop: 6, minHeight: 100 }}
                            value={String(value)}
                            onChange={(event) => handleChangeAnswer(form.id, question.id, event.target.value)}
                          />
                        </label>
                      );
                    }
                    return (
                      <label key={question.id} style={{ fontSize: 13, color: "#CBD5F5" }}>
                        {question.label}
                        <input
                          style={{ ...inputStyle, marginTop: 6 }}
                          value={String(value)}
                          onChange={(event) => handleChangeAnswer(form.id, question.id, event.target.value)}
                        />
                      </label>
                    );
                  })}
                </div>
                <button type="button" style={{ ...buttonStyle, marginTop: 12 }} onClick={() => handleSubmit(form.id)}>
                  Enviar respostas
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={{ margin: 0 }}>Histórico de submissões</h3>
        {entries.length === 0 ? (
          <p style={{ margin: 0, color: "#94A3B8", fontSize: 13 }}>
            Suas respostas enviadas aparecerão aqui.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {forms.map((form) => {
              const formEntries = historyByForm[form.id] ?? [];
              if (formEntries.length === 0) {
                return null;
              }
              return (
                <div key={form.id} style={{ border: "1px solid #1F2937", borderRadius: 12, padding: 12 }}>
                  <strong>{form.title}</strong>
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#CBD5F5", fontSize: 13 }}>
                    {formEntries.map((entry) => (
                      <li key={entry.id} style={{ marginBottom: 8 }}>
                        <span style={{ color: "#94A3B8" }}>
                          {new Date(entry.submittedAt).toLocaleString()}
                        </span>
                        <div style={{ marginTop: 4 }}>
                          {Object.entries(entry.answers).map(([questionId, answer]) => {
                            const question = form.questions.find((item) => item.id === questionId);
                            return (
                              <p key={questionId} style={{ margin: "2px 0" }}>
                                <strong>{question?.label ?? "Resposta"}:</strong> {String(answer)}
                              </p>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
