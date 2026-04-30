import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CLINICAL_BASE_URL } from "@/config/runtime";

export default function BioHubPage() {
  const [status, setStatus] = useState<string>("Carregando...");
  const [error, setError] = useState<string | null>(null);

  const openBiohub = async () => {
    setError(null);
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${CLINICAL_BASE_URL}/api/me/biohub/sso-token`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error?.message ?? "Falha ao abrir BioHub");
      return;
    }
    const sso = payload?.data?.token;
    if (!sso) {
      setError("Token SSO ausente");
      return;
    }
    window.location.href = `https://app.ethos-clinic.com/biohub?sso_token=${encodeURIComponent(sso)}`;
  };

  return (
    <div className="content-container py-8 space-y-4">
      <h1 className="text-2xl font-semibold">BioHub</h1>
      <p className="text-muted-foreground">Bundle ETHOS ou assinatura standalone. Trial de 7 dias com upgrade por auto-serviço.</p>
      <div className="rounded-lg border p-4">
        <p>Status: {status}</p>
        <Button className="mt-3" onClick={openBiohub}>Abrir BioHub</Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="rounded-lg border p-4">
        <h2 className="font-medium">Planos</h2>
        <p className="text-sm text-muted-foreground">Bundle ETHOS vs Standalone BIOHUB.</p>
        <Button className="mt-2" onClick={() => setStatus("Upgrade solicitado")}>Fazer Upgrade</Button>
      </div>
    </div>
  );
}
