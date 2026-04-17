"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionViewer = TranscriptionViewer;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function TranscriptionViewer() {
    const [jobs, setJobs] = (0, react_1.useState)([]);
    const [texts, setTexts] = (0, react_1.useState)({});
    (0, react_1.useEffect)(() => {
        // 🔥 escuta mensagens do worker
        const unsubscribe = window.ethos.transcription.onMessage(async (msg) => {
            if (!msg?.payload?.id)
                return;
            const job = msg.payload;
            // atualiza lista
            setJobs(prev => {
                const exists = prev.find(j => j.id === job.id);
                if (exists) {
                    return prev.map(j => (j.id === job.id ? job : j));
                }
                return [...prev, job];
            });
            // 🔐 descriptografa transcript se existir
            if (job.transcript) {
                const decrypted = await window.ethos.crypto.decrypt(job.transcript);
                setTexts(prev => ({
                    ...prev,
                    [job.id]: decrypted
                }));
            }
        });
        return () => unsubscribe();
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Transcri\u00E7\u00F5es" }), jobs.map(job => ((0, jsx_runtime_1.jsxs)("div", { style: { border: "1px solid #ccc", padding: 10, marginBottom: 10 }, children: [(0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Status:" }), " ", job.status] }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Progresso:" }), " ", job.progress, "%"] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Texto:" }), (0, jsx_runtime_1.jsx)("p", { children: texts[job.id] || "Sem transcrição ainda..." })] })] }, job.id)))] }));
}
