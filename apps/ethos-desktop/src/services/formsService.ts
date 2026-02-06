export type FormQuestionType = "text" | "scale" | "boolean" | "diary";

export type FormQuestion = {
  id: string;
  label: string;
  type: FormQuestionType;
};

export type FormDefinition = {
  id: string;
  title: string;
  description?: string;
  kind: "form" | "diary";
  createdAt: string;
  active: boolean;
  questions: FormQuestion[];
  assignedPatientIds: string[];
};

export type FormEntry = {
  id: string;
  formId: string;
  patientId: string;
  answers: Record<string, string | number | boolean>;
  submittedAt: string;
};

const FORMS_KEY = "ethos.forms";
const ENTRIES_KEY = "ethos.forms.entry";

const loadFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }
  const stored = window.localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }
  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
};

const saveToStorage = <T>(key: string, data: T) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(data));
};

const forms = new Map<string, FormDefinition>(
  loadFromStorage<FormDefinition[]>(FORMS_KEY, []).map((item) => [item.id, item])
);
const entries = new Map<string, FormEntry>(
  loadFromStorage<FormEntry[]>(ENTRIES_KEY, []).map((item) => [item.id, item])
);

const persistForms = () => {
  saveToStorage(FORMS_KEY, Array.from(forms.values()));
};

const persistEntries = () => {
  saveToStorage(ENTRIES_KEY, Array.from(entries.values()));
};

export const formsService = {
  listForms: () => Array.from(forms.values()),
  getForm: (id: string) => forms.get(id),
  createForm: (payload: Omit<FormDefinition, "id" | "createdAt" | "assignedPatientIds" | "active">) => {
    const form: FormDefinition = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      active: true,
      assignedPatientIds: [],
    };
    forms.set(form.id, form);
    persistForms();
    return form;
  },
  updateForm: (id: string, payload: Partial<FormDefinition>) => {
    const existing = forms.get(id);
    if (!existing) {
      throw new Error("Formulário não encontrado");
    }
    const updated = { ...existing, ...payload };
    forms.set(id, updated);
    persistForms();
    return updated;
  },
  toggleAssignPatient: (formId: string, patientId: string) => {
    const existing = forms.get(formId);
    if (!existing) {
      throw new Error("Formulário não encontrado");
    }
    const assigned = existing.assignedPatientIds.includes(patientId)
      ? existing.assignedPatientIds.filter((id) => id !== patientId)
      : [...existing.assignedPatientIds, patientId];
    const updated = { ...existing, assignedPatientIds: assigned };
    forms.set(formId, updated);
    persistForms();
    return updated;
  },
  listEntries: () => Array.from(entries.values()),
  listEntriesByForm: (formId: string) =>
    Array.from(entries.values()).filter((entry) => entry.formId === formId),
  listEntriesByPatient: (patientId: string) =>
    Array.from(entries.values()).filter((entry) => entry.patientId === patientId),
  createEntry: (payload: Omit<FormEntry, "id" | "submittedAt">) => {
    const entry: FormEntry = {
      ...payload,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
    };
    entries.set(entry.id, entry);
    persistEntries();
    return entry;
  },
};
