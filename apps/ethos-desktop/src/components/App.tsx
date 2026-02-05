import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Settings,
  Plus,
  Mic,
  FileText,
  CheckCircle,
  Clock,
  Trash2,
  Shield,
  Download,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { Patient, Session, TranscriptionJob, ClinicalNote } from "@ethos/shared";

type View = "agenda" | "patients" | "session" | "settings";

export const App = () => {
  const [view, setView] = useState<View>("agenda");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeJob, setActiveJob] = useState<TranscriptionJob | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const pts = await window.ethos.patients.getAll();
    const ses = await window.ethos.sessions.getAll();
    setPatients(pts);
    setSessions(ses);
  };

  const handleCreatePatient = async () => {
    const name = prompt("Nome completo do paciente:");
    if (name) {
      await window.ethos.patients.create({ fullName: name });
      loadData();
    }
  };

  const handleNewSession = async (patientId: string) => {
    const session = await window.ethos.sessions.create({
      patientId,
      scheduledAt: new Date().toISOString(),
      status: "scheduled"
    });
    setSelectedSession(session);
    setView("session");
    loadData();
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-accent flex items-center gap-2">
            <Shield size={24} /> ETHOS
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem
            icon={<Calendar size={20} />}
            label="Agenda"
            active={view === "agenda"}
            onClick={() => setView("agenda")}
          />
          <NavItem
            icon={<Users size={20} />}
            label="Pacientes"
            active={view === "patients"}
            onClick={() => setView("patients")}
          />
          <NavItem
            icon={<Settings size={20} />}
            label="Configurações"
            active={view === "settings"}
            onClick={() => setView("settings")}
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
              DR
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Dr. Ricardo Silva</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">CRP 06/123456</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background p-8">
        {view === "agenda" && (
          <AgendaView
            sessions={sessions}
            patients={patients}
            onNewSession={handleNewSession}
            onSelectSession={(s) => { setSelectedSession(s); setView("session"); }}
          />
        )}
        {view === "patients" && (
          <PatientsView
            patients={patients}
            onCreate={handleCreatePatient}
            onSelect={(p) => { setSelectedPatient(p); /* navigate to patient detail if implemented */ }}
            onNewSession={handleNewSession}
          />
        )}
        {view === "session" && selectedSession && (
          <SessionView
            session={selectedSession}
            patient={patients.find(p => p.id === selectedSession.patientId)}
            onBack={() => setView("agenda")}
          />
        )}
        {view === "settings" && <SettingsView />}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
      active ? "bg-accent/10 text-accent" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
    }`}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const AgendaView = ({ sessions, patients, onNewSession, onSelectSession }: any) => (
  <div className="max-w-4xl mx-auto">
    <div className="flex justify-between items-end mb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agenda</h2>
        <p className="text-slate-500 mt-1">Sessões agendadas para esta semana.</p>
      </div>
    </div>

    <div className="space-y-4">
      {sessions.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl text-center">
          <p className="text-slate-500">Nenhuma sessão agendada.</p>
        </div>
      ) : (
        sessions.map((s: Session) => {
          const pt = patients.find((p: Patient) => p.id === s.patientId);
          return (
            <div
              key={s.id}
              onClick={() => onSelectSession(s)}
              className="p-4 bg-card border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-600 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex flex-col items-center justify-center leading-none">
                  <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">SEG</span>
                  <span className="text-lg font-bold">15</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">{pt?.fullName || "Paciente desconhecido"}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> 14:00</span>
                    <span className="flex items-center gap-1">
                      {s.status === "completed" ? (
                        <span className="text-emerald-500 flex items-center gap-1"><CheckCircle size={12} /> Validado</span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1"><Clock size={12} /> Pendente</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-slate-600" size={20} />
            </div>
          );
        })
      )}
    </div>
  </div>
);

const PatientsView = ({ patients, onCreate, onNewSession }: any) => (
  <div className="max-w-4xl mx-auto">
    <div className="flex justify-between items-end mb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pacientes</h2>
        <p className="text-slate-500 mt-1">Gestão de prontuários e histórico.</p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Plus size={18} /> Novo Paciente
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {patients.map((p: Patient) => (
        <div key={p.id} className="p-5 bg-card border border-slate-800 rounded-2xl group transition-all">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-slate-100">{p.fullName}</h3>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Desde {new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => onNewSession(p.id)}
              className="p-2 bg-slate-800 hover:bg-accent text-slate-400 hover:text-white rounded-lg transition-all"
              title="Nova Sessão"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="mt-6 flex gap-2">
            <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-medium transition-colors">Ver Prontuários</button>
            <button className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SessionView = ({ session, patient, onBack }: any) => {
  const [consent, setConsent] = useState(false);
  const [job, setJob] = useState<TranscriptionJob | null>(null);
  const [note, setNote] = useState<ClinicalNote | null>(null);
  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    loadNote();
    const unsub = window.ethos.onTranscriptionMessage((msg: any) => {
      if (msg.type === "job_update") setJob(msg.payload);
      if (msg.type === "job_result") {
        generateInitialDraft(msg.payload.transcript);
      }
    });
    return unsub;
  }, [session.id]);

  const loadNote = async () => {
    const n = await window.ethos.notes.getBySession(session.id);
    if (n) {
      setNote(n);
      setDraftText(n.editedText || n.generatedText);
    }
  };

  const handleImport = async () => {
    if (!consent) return alert("É necessário o consentimento do paciente.");
    const audioPath = await window.ethos.openAudioDialog();
    if (audioPath) {
      await window.ethos.enqueueTranscription({
        sessionId: session.id,
        audioPath,
        model: "ptbr-fast"
      });
    }
  };

  const generateInitialDraft = async (transcript: any) => {
    await window.ethos.notes.generate(session.id, transcript);
    loadNote();
  };

  const handleSave = async () => {
    if (note) {
      await window.ethos.notes.updateDraft(note.id, draftText);
      alert("Rascunho salvo localmente.");
    }
  };

  const handleValidate = async () => {
    if (note) {
      if (confirm("Deseja validar este prontuário? Após validado, ele não poderá ser editado.")) {
        await window.ethos.notes.validate(note.id, "Dr. Ricardo Silva");
        loadNote();
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-6 text-sm transition-colors">
        ← Voltar para Agenda
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Side: Session Info & Control */}
        <div className="flex-1 space-y-6">
          <div className="bg-card border border-slate-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-1">{patient?.fullName}</h2>
            <p className="text-slate-500 text-sm mb-6 flex items-center gap-2">
              <Calendar size={14} /> {new Date(session.scheduledAt).toLocaleString('pt-BR')}
            </p>

            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${consent ? 'border-accent/30 bg-accent/5' : 'border-slate-800 bg-slate-900/50'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-accent focus:ring-accent"
                  />
                  <div>
                    <p className="text-sm font-medium">Tenho consentimento do paciente</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">Obrigatório para processar áudio</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={!consent}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-white disabled:bg-slate-800 text-slate-900 disabled:text-slate-600 font-bold py-3 rounded-xl transition-all"
                >
                  <Mic size={18} /> Importar Áudio
                </button>
              </div>

              {job && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                      {job.status === 'running' ? <Clock size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      {job.status === 'running' ? 'Transcrevendo...' : 'Concluído'}
                    </span>
                    <span className="text-xs font-mono">{Math.round(job.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-accent h-full transition-all duration-500" style={{ width: `${job.progress * 100}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <AlertTriangle size={14} /> Salvaguarda Ética
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed italic">
              "Esta ferramenta auxilia na documentação clínica. A IA não realiza diagnósticos ou sugere condutas automáticas. Todo conteúdo deve ser revisado e validado pelo profissional responsável."
            </p>
          </div>
        </div>

        {/* Right Side: Clinical Note */}
        <div className="flex-[2] space-y-6">
          <div className="bg-card border border-slate-800 rounded-2xl p-8 shadow-xl min-h-[500px] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold">Prontuário de Atendimento</h3>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  note?.status === 'validated' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {note?.status === 'validated' ? 'Validado' : 'Rascunho'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.ethos.export.docx(draftText, patient?.fullName || "Paciente")}
                  className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                  title="Exportar DOCX"
                >
                  <FileText size={20} />
                </button>
                <button
                  onClick={() => window.ethos.export.pdf(draftText, patient?.fullName || "Paciente")}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  title="Exportar PDF"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>

            <textarea
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              disabled={note?.status === 'validated'}
              placeholder="Aguardando transcrição ou digite suas notas aqui..."
              className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-300 resize-none leading-relaxed text-lg"
            />

            <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end gap-3">
              {note?.status !== 'validated' && (
                <>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded-lg text-sm font-medium border border-slate-700 hover:bg-slate-800 transition-colors"
                  >
                    Salvar Rascunho
                  </button>
                  <button
                    onClick={handleValidate}
                    className="px-6 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    Validar Prontuário
                  </button>
                </>
              )}
              {note?.status === 'validated' && (
                <p className="text-xs text-slate-500 flex items-center gap-2 italic">
                  <CheckCircle size={14} className="text-emerald-500" />
                  Validado por Dr. Ricardo Silva em {new Date(note.validatedAt!).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsView = () => (
  <div className="max-w-4xl mx-auto">
    <h2 className="text-3xl font-bold tracking-tight mb-8">Configurações</h2>

    <div className="space-y-6">
      <section className="bg-card border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="font-bold flex items-center gap-2"><Download size={18} /> Modelos de Transcrição</h3>
          <p className="text-xs text-slate-500 mt-1">Gerencie os modelos de IA offline instalados em sua máquina.</p>
        </div>
        <div className="divide-y divide-slate-800">
          <ModelItem
            name="PT-BR Rápido (Baseline)"
            desc="Otimizado para CPU, ideal para transcrições rápidas."
            status="instalado"
            size="1.2 GB"
          />
          <ModelItem
            name="Precisão Máxima (Distil-Whisper)"
            desc="Maior acurácia, requer mais recursos de processamento."
            status="disponível"
            size="2.8 GB"
          />
        </div>
      </section>

      <section className="bg-card border border-slate-800 rounded-2xl p-6">
        <h3 className="font-bold flex items-center gap-2 text-red-500"><Trash2 size={18} /> Privacidade e Dados</h3>
        <p className="text-xs text-slate-500 mt-1">Ações permanentes de limpeza do vault local.</p>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <div>
              <p className="text-sm font-bold text-red-200">Apagar Tudo</p>
              <p className="text-xs text-red-500/60">Remove permanentemente pacientes, sessões, áudios e prontuários.</p>
            </div>
            <button
              onClick={() => window.ethos.purgeAll()}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
            >
              PURGE
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
);

const ModelItem = ({ name, desc, status, size }: any) => (
  <div className="p-6 flex items-center justify-between">
    <div>
      <h4 className="font-semibold text-slate-200">{name}</h4>
      <p className="text-xs text-slate-500 mt-1">{desc} <span className="ml-2 font-mono">{size}</span></p>
    </div>
    <button
      disabled={status === 'instalado'}
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
        status === 'instalado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-accent hover:bg-accent/90 text-white'
      }`}
    >
      {status === 'instalado' ? 'Instalado' : 'Baixar'}
    </button>
  </div>
);
