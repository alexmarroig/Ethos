import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ScrollText, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contractsApi } from "@/api/clinical";
import type { Contract } from "@/api/types";

const ContractPortalPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptedBy, setAcceptedBy] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token não fornecido.");
      setLoading(false);
      return;
    }
    const load = async () => {
      const res = await contractsApi.getPortal(token);
      if (res.success) {
        setContract(res.data);
        if (res.data.status === "accepted") setAccepted(true);
      } else {
        setError(res.error.message);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const handleAccept = async () => {
    if (!acceptedBy.trim()) return;
    setAccepting(true);
    const res = await contractsApi.acceptPortal(token, acceptedBy.trim());
    if (res.success) {
      setAccepted(true);
      setContract(res.data);
    } else {
      setError(res.error.message);
    }
    setAccepting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-medium text-foreground mb-2">Erro</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ScrollText className="w-10 h-10 text-primary mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="font-serif text-3xl font-medium text-foreground">
            {contract?.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ETHOS · Contrato terapêutico
          </p>
        </motion.div>

        {/* Content */}
        <motion.div
          className="rounded-xl border border-border bg-card p-6 mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
            {contract?.content}
          </div>
        </motion.div>

        {/* Accept */}
        {accepted ? (
          <motion.div
            className="flex items-center gap-3 p-4 rounded-xl bg-status-validated/10 border border-status-validated/20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle2 className="w-5 h-5 text-status-validated" />
            <div>
              <p className="text-sm font-medium text-foreground">Contrato aceito</p>
              {contract?.accepted_by && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aceito por: {contract.accepted_by}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Input
              placeholder="Seu nome completo"
              value={acceptedBy}
              onChange={(e) => setAcceptedBy(e.target.value)}
            />
            <Button
              onClick={handleAccept}
              disabled={accepting || !acceptedBy.trim()}
              className="w-full gap-2"
            >
              {accepting && <Loader2 className="w-4 h-4 animate-spin" />}
              Aceitar contrato
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ContractPortalPage;
