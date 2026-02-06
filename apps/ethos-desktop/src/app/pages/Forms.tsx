import React, { useEffect, useMemo, useState } from "react";
import type { Patient } from "@ethos/shared";
import { formsService, type FormDefinition, type FormEntry, type FormQuestionType } from "../../services/formsService";
import { patientsService } from "../../services/patientsService";

const cardStyle: React.CSSProperties = {
  background: "#111827",
  padding: 20,
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#94A3B8",
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

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#1E293B",
  color: "#E2E8F0",
};

const questionTypeLabels: Record<FormQuestionType, string> = {
  text: "Texto curto",
  scale: "Escala 1-5",
  boolean: "Sim/Não",
  diary: "Diário livre",
};

export const Forms = () => {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<FormDefinition["kind"]>("form");
  const [questionLabel, setQuestionLabel] = useState("");
  const [questionType, setQuestionType] = useState<FormQuestionType>("text");
  const [questions, setQuestions] = useState<FormDefinition["questions"]>([]);

  const refresh = () => {
    setForms(formsService.listForms());
    setPatients(patientsService.list());
    setEntries(formsService.listEntries());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAddQuestion = () => {
    if (!questionLabel.trim()) {
      return;
    }
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: questionLabel.trim(),
        type: questionType,
      },
    ]);
    setQuestionLabel("");
  };

  const handleCreateForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    formsService.createForm({
      title: title.trim(),
      description: description.trim() || undefined,
      kind,
      questions: questions.length
        ? questions
        : [
            {
              id: crypto.randomUUID(),
              label: "Registro livre",
              type: "diary",
            },
          ],
    });
    setTitle("");
    setDescription("");
    setKind("form");
    setQuestions([]);
    refresh();
  };

  const handleToggleAssignment = (formId: string, patientId: string) => {
    formsService.toggleAssignPatient(formId, patientId);
    refresh();
  };

  const patientLookup = useMemo(() => {
    return new Map(patients.map((patient) => [patient.id, patient]));
  }, [patients]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Formulários & Diário</h2>
        <p style={{ color: "#94A3B8" }}>
          Crie formulários, autorize pacientes e acompanhe respostas enviadas pelo portal.
        </p>
      </header>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <section style={cardStyle}>
          <h3 style={{ margin: 0 }}>Novo formulário/diário</h3>
          <form onSubmit={handleCreateForm} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={labelStyle}>
              Tipo
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as FormDefinition["kind"])}
                style={{ ...inputStyle, marginTop: 6 }}
              >
                <option value="form">Formulário estruturado</option>
                <option value="diary">Diário recorrente</option>
              </select>
            </label>
            <label style={labelStyle}>
              Título
              <input
                style={{ ...inputStyle, marginTop: 6 }}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Check-in semanal"
              />
            </label>
            <label style={labelStyle}>
              Descrição (opcional)
              <textarea
                style={{ ...inputStyle, marginTop: 6, minHeight: 70 }}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Oriente o paciente sobre o objetivo do formulário"
              />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={labelStyle}>Perguntas</span>
              {questions.length === 0 ? (
                <p style={{ margin: 0, color: "#64748B", fontSize: 13 }}>
                  Sem perguntas adicionadas. Um campo de diário será criado automaticamente.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, color: "#E2E8F0", fontSize: 13 }}>
                  {questions.map((question) => (
                    <li key={question.id}>
                      {question.label} · {questionTypeLabels[question.type]}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={questionLabel}
                  onChange={(event) => setQuestionLabel(event.target.value)}
                  placeholder="Digite a pergunta"
                />
                <select
                  value={questionType}
                  onChange={(event) => setQuestionType(event.target.value as FormQuestionType)}
                  style={inputStyle}
                >
                  <option value="text">Texto curto</option>
                  <option value="scale">Escala 1-5</option>
                  <option value="boolean">Sim/Não</option>
                  <option value="diary">Diário livre</option>
                </select>
                <button type="button" style={secondaryButtonStyle} onClick={handleAddQuestion}>
                  Adicionar
                </button>
              </div>
            </div>
            <button type="submit" style={buttonStyle}>
              Criar e compartilhar
            </button>
          </form>
        </section>

        <section style={cardStyle}>
          <h3 style={{ margin: 0 }}>Autorizações por paciente</h3>
          {patients.length === 0 ? (
            <p style={{ margin: 0, color: "#94A3B8", fontSize: 13 }}>
              Cadastre pacientes para liberar formulários e enviar códigos de acesso ao portal.
            </p>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {forms.length === 0 ? (
              <p style={{ margin: 0, color: "#94A3B8", fontSize: 13 }}>
                Nenhum formulário criado ainda.
              </p>
            ) : (
              forms.map((form) => (
                <div key={form.id} style={{ border: "1px solid #1F2937", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{form.title}</strong>
                      <p style={{ margin: "4px 0", color: "#94A3B8", fontSize: 12 }}>
                        {form.kind === "diary" ? "Diário" : "Formulário"} · {form.questions.length} pergunta(s)
                      </p>
                    </div>
                    <span style={{ fontSize: 12, color: "#38BDF8" }}>
                      {form.assignedPatientIds.length} paciente(s)
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {patients.map((patient) => {
                      const assigned = form.assignedPatientIds.includes(patient.id);
                      return (
                        <label
                          key={patient.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                            color: assigned ? "#E2E8F0" : "#94A3B8",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={assigned}
                            onChange={() => handleToggleAssignment(form.id, patient.id)}
                          />
                          {patient.name}
                          <span style={{ color: "#64748B" }}>(Código: {patient.id.slice(0, 8)})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={cardStyle}>
          <h3 style={{ margin: 0 }}>Histórico de submissões</h3>
          {entries.length === 0 ? (
            <p style={{ margin: 0, color: "#94A3B8", fontSize: 13 }}>
              As respostas enviadas pelos pacientes aparecerão aqui com histórico completo.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {forms.map((form) => {
                const formEntries = entries.filter((entry) => entry.formId === form.id);
                if (formEntries.length === 0) {
                  return null;
                }
                return (
                  <div key={form.id} style={{ border: "1px solid #1F2937", borderRadius: 12, padding: 12 }}>
                    <strong>{form.title}</strong>
                    <p style={{ margin: "4px 0 12px", fontSize: 12, color: "#94A3B8" }}>
                      {formEntries.length} submissão(ões) registradas
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#E2E8F0", fontSize: 13 }}>
                      {formEntries.map((entry) => {
                        const patient = patientLookup.get(entry.patientId);
                        return (
                          <li key={entry.id} style={{ marginBottom: 8 }}>
                            <strong>{patient?.name ?? "Paciente"}</strong> ·
                            <span style={{ color: "#94A3B8" }}> {new Date(entry.submittedAt).toLocaleString()}</span>
                            <div style={{ marginTop: 4, color: "#CBD5F5" }}>
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
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
