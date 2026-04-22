import { useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type CashflowMonth } from "@/services/financeService";

type CashflowTableProps = {
  rows: CashflowMonth[];
  formatCurrency: (value: number) => string;
};

const emptyRow: CashflowMonth = {
  monthKey: "",
  monthLabel: "-",
  receivedRevenue: 0,
  pendingRevenue: 0,
  totalRevenue: 0,
  paidExpenses: 0,
  pendingExpenses: 0,
  monthlyResult: 0,
};

export function CashflowTable({ rows, formatCurrency }: CashflowTableProps) {
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [cumulativeView, setCumulativeView] = useState(false);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (fromMonth && row.monthKey < fromMonth) return false;
        if (toMonth && row.monthKey > toMonth) return false;
        return true;
      }),
    [rows, fromMonth, toMonth],
  );

  const displayedRows = useMemo(() => {
    if (!cumulativeView) return filteredRows;

    let running = {
      receivedRevenue: 0,
      pendingRevenue: 0,
      totalRevenue: 0,
      paidExpenses: 0,
      pendingExpenses: 0,
      monthlyResult: 0,
    };

    return filteredRows.map((row) => {
      running = {
        receivedRevenue: running.receivedRevenue + row.receivedRevenue,
        pendingRevenue: running.pendingRevenue + row.pendingRevenue,
        totalRevenue: running.totalRevenue + row.totalRevenue,
        paidExpenses: running.paidExpenses + row.paidExpenses,
        pendingExpenses: running.pendingExpenses + row.pendingExpenses,
        monthlyResult: running.monthlyResult + row.monthlyResult,
      };

      return {
        ...row,
        ...running,
      };
    });
  }, [filteredRows, cumulativeView]);

  const totals = useMemo(
    () =>
      displayedRows.reduce(
        (accumulator, row) => ({
          receivedRevenue: accumulator.receivedRevenue + row.receivedRevenue,
          pendingRevenue: accumulator.pendingRevenue + row.pendingRevenue,
          totalRevenue: accumulator.totalRevenue + row.totalRevenue,
          paidExpenses: accumulator.paidExpenses + row.paidExpenses,
          pendingExpenses: accumulator.pendingExpenses + row.pendingExpenses,
          monthlyResult: accumulator.monthlyResult + row.monthlyResult,
        }),
        { ...emptyRow },
      ),
    [displayedRows],
  );

  return (
    <div className="rounded-[1.6rem] border border-border bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Fluxo de Caixa</h3>
          <p className="text-sm text-muted-foreground">
            Visão mensal de receitas e despesas para apoiar decisões financeiras.
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Como funciona
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm space-y-2 p-3 text-xs">
              <p>
                Receitas usam lançamentos com valor positivo: pago entra em
                "recebidas" e pendente em "a receber".
              </p>
              <p>
                Despesas usam lançamentos com valor negativo: pago entra em
                "pagas" e pendente em "a pagar".
              </p>
              <p>
                Resultado mensal = total receitas - (despesas pagas + despesas a
                pagar).
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[220px_220px_auto] md:items-center">
        <Input type="month" value={fromMonth} onChange={(event) => setFromMonth(event.target.value)} />
        <Input type="month" value={toMonth} onChange={(event) => setToMonth(event.target.value)} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={cumulativeView} onCheckedChange={setCumulativeView} />
          Visão acumulada
        </label>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mês</TableHead>
            <TableHead className="text-right">Receitas recebidas</TableHead>
            <TableHead className="text-right">Receitas a receber</TableHead>
            <TableHead className="text-right">Total receitas</TableHead>
            <TableHead className="text-right">Despesas pagas</TableHead>
            <TableHead className="text-right">Despesas a pagar</TableHead>
            <TableHead className="text-right">Resultado mensal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado.
              </TableCell>
            </TableRow>
          ) : (
            displayedRows.map((row) => (
              <TableRow key={row.monthKey}>
                <TableCell className="font-medium capitalize">{row.monthLabel}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.receivedRevenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.pendingRevenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.totalRevenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.paidExpenses)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.pendingExpenses)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(row.monthlyResult)}</TableCell>
              </TableRow>
            ))
          )}

          {displayedRows.length > 0 ? (
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.receivedRevenue)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.pendingRevenue)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.totalRevenue)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.paidExpenses)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.pendingExpenses)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.monthlyResult)}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
