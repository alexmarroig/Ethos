import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Plus, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scaleService, Scale, ScaleRecord } from "@/services/scaleService";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ScaleCardSkeleton } from "@/components/SkeletonCards";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

const ScalesPage = () => {
  const { toast } = useToast();
  const [scales, setScales] = useState<Scale[]>([]);
  const [records, setRecords] = useState<ScaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);

  // Apply scale dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedScaleId, setSelectedScaleId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [score, setScore] = useState("");

  useEffect(() => {
    const load = async () => {
      const [scalesRes, recordsRes] = await Promise.all([
        scaleService.list(),
        scaleService.listRecords(),
      ]);
      if (!scalesRes.success) {
        setError({ message: scalesRes.error.message, requestId: scalesRes.request_id });
      } else {
        setScales(scalesRes.data);
      }
      if (recordsRes.success) setRecords(recordsRes.data);
      setLoading(false);
    };
    load();
  }, []);

  const handleApply = async () => {
    if (!selectedScaleId || !patientId || !score) return;
    setApplying(true);
    const res = await scaleService.record({
      scale_id: selectedScaleId,
      patient_id: patientId,
      score: parseFloat(score),
    });
    if (res.success) {
      setRecords((prev) => [...prev, res.data]);
      setDialogOpen(false);
      setSelectedScaleId(""); setPatientId(""); setScore("");
      toast({ title: "Escala registrada" });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setApplying(false);
  };

  const chartData = records.map((r) => ({
    date: new Date(r.applied_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    score: r.score,
  }));

  if (loading) {
    return (
      <div className="content-container py-8 md:py-12">
        <Skeleton className="h-10 w-52 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />
        <Skeleton className="h-48 w-full rounded-xl mb-8" />
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<ScaleCardSkeleton key={i} />))}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <h1 className="font-serif text-3xl font-medium text-foreground mb-6">Escalas Clínicas</h1>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Escalas Clínicas</h1>
          <p className="mt-2 text-muted-foreground">Instrumentos de avaliação padronizados.</p>
        </motion.header>

        <motion.div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Instrumento auxiliar. Não substitui avaliação clínica.</p>
        </motion.div>

        {chartData.length > 0 && (
          <motion.div className="mb-8 p-6 rounded-xl border border-border bg-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="font-serif text-lg font-medium text-foreground mb-4">Evolução</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        <motion.div className="space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-foreground">Catálogo de escalas</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Aplicar escala
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Aplicar escala</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="ID da escala" value={selectedScaleId} onChange={(e) => setSelectedScaleId(e.target.value)} />
                  <Input placeholder="ID do paciente" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
                  <Input type="number" placeholder="Score" value={score} onChange={(e) => setScore(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button onClick={handleApply} disabled={applying || !selectedScaleId || !patientId || !score} className="gap-2">
                    {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {scales.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma escala disponível no momento.</p>
            </div>
          ) : (
            scales.map((scale) => (
              <div key={scale.id} className="session-card cursor-pointer">
                <h3 className="font-serif text-lg font-medium text-foreground">{scale.name}</h3>
                {scale.description && <p className="mt-1 text-sm text-muted-foreground">{scale.description}</p>}
              </div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ScalesPage;
