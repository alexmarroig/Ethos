
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FinanceTrendPoint = {
  label: string;
  received: number;
  open: number;
};

export type FinanceTopPatient = {
  patientName: string;
  amount: number;
  count: number;
};

export function FinanceTrendChart({ data, formatCurrency }: { data: FinanceTrendPoint[]; formatCurrency: (value: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="financeReceived" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="financeOpen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} width={60} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(15,23,42,0.96)",
            color: "#fff",
          }}
        />
        <Area type="monotone" dataKey="received" name="Recebido" stroke="#3ecf8e" strokeWidth={3} fill="url(#financeReceived)" />
        <Area type="monotone" dataKey="open" name="Em aberto" stroke="#f59e0b" strokeWidth={3} fill="url(#financeOpen)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FinanceTopPatientsChart({ data, formatCurrency }: { data: FinanceTopPatient[]; formatCurrency: (value: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
        <YAxis dataKey="patientName" type="category" tickLine={false} axisLine={false} width={120} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(15,23,42,0.96)",
            color: "#fff",
          }}
        />
        <Bar dataKey="amount" radius={[10, 10, 10, 10]}>
          {data.map((_, index) => (
            <Cell key={index} fill={index === 0 ? "#5dd0f3" : "#2f9bb8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
