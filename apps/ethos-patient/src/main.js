const storage = {
  get baseUrl() {
    return localStorage.getItem("ethos.patient.baseUrl") ?? "";
  },
  set baseUrl(value) {
    localStorage.setItem("ethos.patient.baseUrl", value);
  },
  get token() {
    return localStorage.getItem("ethos.patient.token") ?? "";
  },
  set token(value) {
    if (value) {
      localStorage.setItem("ethos.patient.token", value);
    } else {
      localStorage.removeItem("ethos.patient.token");
    }
  },
  clear() {
    localStorage.removeItem("ethos.patient.token");
  },
};

const loginForm = document.querySelector("#login-form");
const entryForm = document.querySelector("#entry-form");
const formsList = document.querySelector("#forms-list");
const formsEmpty = document.querySelector("#forms-empty");
const entryStatus = document.querySelector("#entry-status");
const refreshButton = document.querySelector("#refresh");
const logoutButton = document.querySelector("#logout");
const baseUrlInput = document.querySelector("#base-url");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const patientIdInput = document.querySelector("#patient-id");
const formIdInput = document.querySelector("#form-id");
const formContentInput = document.querySelector("#form-content");

const setEntryStatus = (message, type = "") => {
  if (!entryStatus) return;
  entryStatus.textContent = message;
  entryStatus.className = "status";
  if (type === "success") entryStatus.classList.add("status--success");
  if (type === "error") entryStatus.classList.add("status--error");
};

const setFormsEmpty = (message) => {
  if (!formsEmpty) return;
  formsEmpty.textContent = message;
};

const createCard = (item) => {
  const card = document.createElement("li");
  card.className = "card";

  const title = document.createElement("div");
  title.className = "card__title";
  title.textContent = `Formulário ${item.form_id}`;

  const meta = document.createElement("div");
  meta.className = "card__meta";
  meta.textContent = `Paciente ${item.patient_id} · ${new Date(item.created_at).toLocaleString("pt-BR")}`;

  const actions = document.createElement("div");
  actions.className = "card__actions";

  const respondButton = document.createElement("button");
  respondButton.type = "button";
  respondButton.textContent = "Responder";
  respondButton.addEventListener("click", () => {
    if (patientIdInput) patientIdInput.value = item.patient_id;
    if (formIdInput) formIdInput.value = item.form_id;
    if (formContentInput) formContentInput.value = JSON.stringify(item.content, null, 2);
    setEntryStatus("Formulário selecionado. Atualize as respostas e envie.");
  });

  actions.appendChild(respondButton);
  card.append(title, meta, actions);

  return card;
};

const fetchJson = async (path, init) => {
  if (!storage.baseUrl) throw new Error("Defina a URL do servidor.");
  const res = await fetch(`${storage.baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(storage.token ? { authorization: `Bearer ${storage.token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await res.json();
  if (!res.ok) {
    const errorMessage = payload?.error?.message ?? "Erro inesperado";
    throw new Error(errorMessage);
  }
  return payload.data;
};

const loadForms = async () => {
  if (!formsList || !formsEmpty) return;
  formsList.innerHTML = "";
  if (!storage.token) {
    setFormsEmpty("Faça login para visualizar os formulários disponíveis.");
    return;
  }
  try {
    setFormsEmpty("Carregando tarefas...");
    const data = await fetchJson("/forms?page=1&pageSize=50");
    if (!data.items || data.items.length === 0) {
      setFormsEmpty("Nenhuma tarefa liberada no momento.");
      return;
    }
    formsEmpty.textContent = "";
    data.items.forEach((item) => formsList.appendChild(createCard(item)));
  } catch (error) {
    setFormsEmpty(error instanceof Error ? error.message : "Falha ao carregar tarefas.");
  }
};

const handleLogin = async (event) => {
  event.preventDefault();
  if (!loginForm || !baseUrlInput || !emailInput || !passwordInput) return;
  storage.baseUrl = baseUrlInput.value.trim();

  try {
    const data = await fetchJson("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      }),
    });
    storage.token = data.token;
    setEntryStatus(`Bem-vindo, ${data.user.name}.`, "success");
    await loadForms();
  } catch (error) {
    setEntryStatus(error instanceof Error ? error.message : "Falha no login", "error");
  }
};

const handleEntrySubmit = async (event) => {
  event.preventDefault();
  if (!entryForm || !patientIdInput || !formIdInput || !formContentInput) return;
  if (!storage.token) {
    setEntryStatus("Faça login antes de enviar o formulário.", "error");
    return;
  }

  let content = {};
  const rawContent = formContentInput.value.trim();
  if (rawContent) {
    try {
      content = JSON.parse(rawContent);
    } catch {
      setEntryStatus("O conteúdo deve estar em JSON válido.", "error");
      return;
    }
  }

  try {
    await fetchJson("/forms/entry", {
      method: "POST",
      body: JSON.stringify({
        patient_id: patientIdInput.value.trim(),
        form_id: formIdInput.value.trim(),
        content,
      }),
    });
    setEntryStatus("Formulário enviado com sucesso!", "success");
    formContentInput.value = "";
    await loadForms();
  } catch (error) {
    setEntryStatus(error instanceof Error ? error.message : "Falha ao enviar.", "error");
  }
};

const handleLogout = () => {
  storage.clear();
  setEntryStatus("Você saiu da sessão.");
  loadForms();
};

if (baseUrlInput) baseUrlInput.value = storage.baseUrl || "http://localhost:3333";
if (loginForm) loginForm.addEventListener("submit", handleLogin);
if (entryForm) entryForm.addEventListener("submit", handleEntrySubmit);
if (refreshButton) refreshButton.addEventListener("click", () => void loadForms());
if (logoutButton) logoutButton.addEventListener("click", handleLogout);

void loadForms();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Service worker registration is optional; ignore failures.
    });
  });
}
