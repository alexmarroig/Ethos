import React from "react";

export const Pacientes = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h2 style={{ marginBottom: 4 }}>Pacientes</h2>
        <p style={{ color: "#94A3B8" }}>Lista com status de acompanhamento.</p>
      </header>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <p>Marina Alves · Ativa</p>
        <p>João Costa · Retorno pendente</p>
        <p>Rafael Lima · Sessão amanhã</p>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Plano de segurança</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>Sinais de alerta: isolamento, insônia e irritabilidade.</li>
          <li>Estratégias de enfrentamento: respiração guiada, caminhada curta, diário emocional.</li>
          <li>Rede de apoio: irmã (Camila) e grupo de suporte semanal.</li>
          <li>Restrição de meios: manter medicamentos em caixa trancada.</li>
        </ul>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Episódios críticos</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>02/09 · crise moderada após conflito familiar · intervenção: contato com responsável.</li>
          <li>18/08 · risco alto · acionado plano de segurança e consulta emergencial.</li>
        </ul>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Contatos de emergência</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>Camila Alves (irmã) · (11) 98888-1122 · disponível à noite.</li>
          <li>Dr. Henrique Souza · (11) 3333-4400 · consultório.</li>
          <li>CAPS Centro · (11) 2222-1100 · plantão 24h.</li>
        </ul>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Checklist de conduta</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>Validar consentimento informado · concluído.</li>
          <li>Revisar fatores de risco atuais · pendente.</li>
          <li>Atualizar plano de segurança · pendente.</li>
          <li>Agendar follow-up em até 7 dias · concluído.</li>
        </ul>
      </section>
      <section style={{ background: "#111827", padding: 20, borderRadius: 16 }}>
        <h3 style={{ marginTop: 0 }}>Registro histórico</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#CBD5F5" }}>
          <li>2024 · Histórico familiar de ansiedade generalizada.</li>
          <li>2023 · Mudança de cidade e redução de rede de suporte.</li>
          <li>2022 · Primeira avaliação clínica registrada.</li>
        </ul>
      </section>
    </div>
  );
};
