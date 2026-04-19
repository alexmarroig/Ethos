"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPanel = AdminPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const subtleText = { color: "#94A3B8" };
function AdminPanel({ metrics, users }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: "grid", gap: 16 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: 16, flexWrap: "wrap" }, children: [(0, jsx_runtime_1.jsx)(StatCard, { label: "Usu\u00E1rios ativos", value: metrics?.users_total ?? "--" }), (0, jsx_runtime_1.jsx)(StatCard, { label: "Eventos de telemetria", value: metrics?.telemetry_total ?? "--" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { style: { marginBottom: 8 }, children: "Usu\u00E1rios (sanitizado)" }), (0, jsx_runtime_1.jsx)("div", { style: { display: "grid", gap: 8 }, children: users.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { style: subtleText, children: "Nenhum usu\u00E1rio encontrado." })) : (users.map((user) => ((0, jsx_runtime_1.jsxs)("div", { style: {
                                display: "grid",
                                gridTemplateColumns: "1.5fr 1fr 1fr",
                                gap: 12,
                                padding: 12,
                                background: "#0B1120",
                                borderRadius: 12,
                            }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { style: { color: "#E2E8F0", marginBottom: 2 }, children: user.email }), (0, jsx_runtime_1.jsxs)("p", { style: { ...subtleText, fontSize: 12 }, children: ["ID: ", user.id] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { style: { ...subtleText, fontSize: 12 }, children: "Role" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#E2E8F0" }, children: user.role })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { style: { ...subtleText, fontSize: 12 }, children: "Status" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#E2E8F0" }, children: user.status })] })] }, user.id)))) })] })] }));
}
function StatCard({ label, value }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { background: "#0B1120", padding: 16, borderRadius: 12, minWidth: 180 }, children: [(0, jsx_runtime_1.jsx)("p", { style: subtleText, children: label }), (0, jsx_runtime_1.jsx)("p", { style: { fontSize: 24, fontWeight: 700 }, children: value })] }));
}
