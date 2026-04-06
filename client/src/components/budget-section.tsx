import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info, Wallet, Hotel, UtensilsCrossed, Bus, Zap, MoreHorizontal, X } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, Cell, Legend } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_BG,
  type BudgetCategory, type BudgetSummary, type BudgetAlert, type LocalExpense,
  computeBudgetSummary, generateAlerts, computeBalances,
} from "@/lib/budget-utils";

const CATEGORY_ICONS: Record<BudgetCategory, any> = {
  hotel: Hotel,
  food: UtensilsCrossed,
  transport: Bus,
  activities: Zap,
  other: MoreHorizontal,
};

interface ExpenseItem {
  id: number | string;
  dayNumber: number | null;
  category: string;
  amount: string;
  note: string | null;
  createdAt: string | Date | null;
  paidBy?: string;
  splitWith?: string[];
}

interface BudgetSectionProps {
  trip: any;
  expenses: ExpenseItem[];
  currency: string;
  onAddExpense: (data: { dayNumber: number; category: string; amount: string; note: string; paidBy?: string; splitWith?: string[] }) => void;
  onDeleteExpense: (id: number | string) => void;
  isAdding?: boolean;
  dayCount: number;
  participants?: string[];
}

function TopSummaryCard({ summary, currency }: { summary: BudgetSummary; currency: string }) {
  const remaining = summary.totalBudget - summary.totalActual;
  const isOverBudget = remaining < 0;
  const spentPct = summary.totalBudget > 0 ? (summary.totalActual / summary.totalBudget) * 100 : 0;

  return (
    <Card className="p-4" data-testid="card-budget-summary">
      <div className="text-center mb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Budget restant</p>
        <p className={`text-3xl font-bold ${isOverBudget ? "text-red-400" : "text-emerald-400"}`} data-testid="text-budget-remaining">
          {isOverBudget ? "-" : ""}{currency}{Math.abs(remaining).toFixed(0)}
        </p>
        {isOverBudget && (
          <p className="text-[10px] text-red-400 mt-0.5">Dépassement du budget</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t border-border/30">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Budget</p>
          <p className="text-base font-bold text-foreground" data-testid="text-budget-total">{currency}{summary.totalBudget}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Prévu</p>
          <p className="text-base font-bold text-orange-400" data-testid="text-budget-planned">{currency}{summary.totalPlanned.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Dépensé</p>
          <p className={`text-base font-bold ${summary.totalActual > summary.totalPlanned ? "text-red-400" : "text-emerald-400"}`} data-testid="text-budget-spent">
            {currency}{summary.totalActual.toFixed(0)}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverBudget
                ? "bg-gradient-to-r from-red-400 to-red-500"
                : "bg-gradient-to-r from-emerald-400 to-emerald-500"
            }`}
            style={{ width: `${Math.min(100, spentPct)}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          {spentPct.toFixed(0)}% du budget utilisé
        </p>
      </div>
    </Card>
  );
}

function CumulativeChart({ summary, currency }: { summary: BudgetSummary; currency: string }) {
  if (summary.cumulativeData.length === 0) return null;
  const hasActual = summary.totalActual > 0;

  return (
    <Card className="p-4" data-testid="card-cumulative-chart">
      <h4 className="text-sm font-bold mb-3">Courbe cumulée</h4>
      <div className="h-[200px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={summary.cumulativeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                `${currency}${value.toFixed(0)}`,
                name === "planned" ? "Prévu" : "Dépensé",
              ]}
            />
            <Area
              type="monotone"
              dataKey="planned"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="url(#gradPlanned)"
              name="planned"
            />
            {hasActual && (
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradActual)"
                name="actual"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 border-b-2 border-dashed border-orange-400" />
          <span className="text-[10px] text-muted-foreground">Prévu</span>
        </div>
        {hasActual && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-emerald-400 rounded-full" />
            <span className="text-[10px] text-muted-foreground">Dépensé</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function CategoryBreakdown({ summary, currency }: { summary: BudgetSummary; currency: string }) {
  return (
    <Card className="p-4" data-testid="card-category-breakdown">
      <h4 className="text-sm font-bold mb-3">Répartition par catégorie</h4>
      <div className="space-y-3">
        {CATEGORIES.map(cat => {
          const { planned, actual } = summary.categoryTotals[cat];
          const Icon = CATEGORY_ICONS[cat];
          const pct = planned > 0 ? (actual / planned) * 100 : 0;
          const isOver = actual > planned && planned > 0;

          return (
            <div key={cat} data-testid={`category-${cat}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: CATEGORY_COLORS[cat] }} />
                  <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[cat]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={isOver ? "text-red-400 font-semibold" : "text-foreground font-medium"}>
                    {currency}{actual.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground/60">/</span>
                  <span className="text-muted-foreground">{currency}{planned.toFixed(0)}</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    backgroundColor: isOver ? "#ef4444" : CATEGORY_COLORS[cat],
                  }}
                />
              </div>
              {isOver && (
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full rounded-full bg-red-400/30"
                    style={{ width: `${Math.min(100, ((actual - planned) / planned) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DayByDayBars({ summary, currency }: { summary: BudgetSummary; currency: string }) {
  if (summary.dayData.length === 0) return null;

  const chartData = summary.dayData.map(d => ({
    name: `J${d.dayNumber}`,
    planned: d.planned,
    actual: d.actual,
    color: d.color,
    city: d.city,
  }));

  return (
    <Card className="p-4" data-testid="card-day-bars">
      <h4 className="text-sm font-bold mb-3">Budget jour par jour</h4>
      <div className="h-[180px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                `${currency}${value.toFixed(0)}`,
                name === "planned" ? "Prévu" : "Dépensé",
              ]}
            />
            <Bar dataKey="planned" fill="#f9731640" stroke="#f97316" strokeWidth={1} radius={[2, 2, 0, 0]} name="planned" />
            <Bar dataKey="actual" radius={[2, 2, 0, 0]} name="actual">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.actual > entry.planned ? "#ef4444" : "#10b981"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function AverageProjection({ summary, currency }: { summary: BudgetSummary; currency: string }) {
  if (summary.totalActual === 0) return null;

  const totalDays = summary.dayData.length;

  return (
    <Card className="p-4" data-testid="card-average-projection">
      <h4 className="text-sm font-bold mb-3">Moyenne journalière</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 rounded-md bg-orange-500/10">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Prévu</p>
          <p className="text-lg font-bold text-orange-400">{currency}{summary.avgPlannedPerDay.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">/jour</p>
        </div>
        <div className="text-center p-2 rounded-md bg-emerald-500/10">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Réel</p>
          <p className={`text-lg font-bold ${summary.avgActualPerDay > summary.avgPlannedPerDay ? "text-red-400" : "text-emerald-400"}`}>
            {currency}{summary.avgActualPerDay.toFixed(0)}
          </p>
          <p className="text-[10px] text-muted-foreground">/jour</p>
        </div>
      </div>
      {totalDays > summary.daysElapsed && summary.projection > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Projection sur {totalDays} jours : <span className={`font-semibold ${summary.projection > summary.totalPlanned ? "text-red-400" : "text-emerald-400"}`}>
            {currency}{summary.projection.toFixed(0)}
          </span>
        </p>
      )}
    </Card>
  );
}

function SmartAlerts({ alerts }: { alerts: BudgetAlert[] }) {
  if (alerts.length === 0) return null;

  const iconMap = {
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
  };
  const colorMap = {
    warning: "text-red-400 bg-red-500/10 border-red-500/20",
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  return (
    <div className="space-y-2" data-testid="budget-alerts">
      {alerts.map((alert, i) => {
        const Icon = iconMap[alert.type];
        return (
          <div key={i} className={`flex items-start gap-2.5 p-3 rounded-md border ${colorMap[alert.type]}`} data-testid={`alert-${alert.type}-${i}`}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-xs font-medium">{alert.message}</span>
          </div>
        );
      })}
    </div>
  );
}

function ExpenseHistory({
  expenses,
  currency,
  onDelete,
  dayData,
}: {
  expenses: ExpenseItem[];
  currency: string;
  onDelete: (id: number | string) => void;
  dayData: { dayNumber: number; city: string }[];
}) {
  const sorted = [...expenses].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  if (sorted.length === 0) return null;

  return (
    <Card className="p-4" data-testid="card-expense-history">
      <h4 className="text-sm font-bold mb-3">Historique des dépenses</h4>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {sorted.map(exp => {
          const cat = (CATEGORIES.includes(exp.category as BudgetCategory) ? exp.category : "other") as BudgetCategory;
          const Icon = CATEGORY_ICONS[cat];
          const dayInfo = exp.dayNumber ? dayData.find(d => d.dayNumber === exp.dayNumber) : null;

          return (
            <div key={exp.id} className="flex items-center gap-2.5 p-2 rounded-md bg-muted/20" data-testid={`expense-${exp.id}`}>
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${CATEGORY_COLORS[cat]}20` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: CATEGORY_COLORS[cat] }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{exp.note || CATEGORY_LABELS[cat]}</p>
                <p className="text-[10px] text-muted-foreground">
                  {dayInfo ? `J${exp.dayNumber} \u2013 ${dayInfo.city}` : exp.dayNumber ? `J${exp.dayNumber}` : ""}
                  {exp.paidBy && <span> &middot; Payé par {exp.paidBy}</span>}
                  {exp.splitWith && exp.splitWith.length > 0 && <span> &middot; /{exp.splitWith.length}</span>}
                </p>
              </div>
              <span className="text-sm font-bold text-red-400 shrink-0">{currency}{parseFloat(exp.amount as string).toFixed(0)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground"
                onClick={() => onDelete(exp.id)}
                data-testid={`button-delete-expense-${exp.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AddExpenseModal({
  days,
  onAdd,
  isAdding,
  trigger,
  participants,
}: {
  days: { dayNumber: number; city: string; dateLabel: string }[];
  onAdd: (data: { dayNumber: number; category: string; amount: string; note: string; paidBy?: string; splitWith?: string[] }) => void;
  isAdding?: boolean;
  trigger: React.ReactNode;
  participants?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<BudgetCategory>("food");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dayNumber, setDayNumber] = useState(days.length > 0 ? days[days.length - 1].dayNumber : 1);
  const [paidBy, setPaidBy] = useState(participants?.[0] || "");
  const [splitWith, setSplitWith] = useState<string[]>(participants || []);

  const hasParticipants = participants && participants.length > 0;

  const toggleSplit = (name: string) => {
    setSplitWith(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    onAdd({
      dayNumber,
      category,
      amount,
      note,
      ...(hasParticipants ? { paidBy, splitWith: splitWith.length > 0 ? splitWith : [paidBy] } : {}),
    });
    setAmount("");
    setNote("");
    if (hasParticipants) {
      setSplitWith(participants);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o && hasParticipants) {
        setPaidBy(participants[0]);
        setSplitWith([...participants]);
      }
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md" data-testid="dialog-add-expense">
        <DialogHeader>
          <DialogTitle>Ajouter une dépense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-2 block">Catégorie</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => {
                const Icon = CATEGORY_ICONS[cat];
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      isActive
                        ? "text-white border-transparent"
                        : "bg-card border-border/50 text-muted-foreground"
                    }`}
                    style={isActive ? { backgroundColor: CATEGORY_COLORS[cat] } : undefined}
                    data-testid={`pill-category-${cat}`}
                  >
                    <Icon className="w-3 h-3" />
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Montant</label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0"
              step="0.01"
              data-testid="input-expense-amount"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Note (optionnel)</label>
            <Input
              placeholder="Pad Thai chez Thip Samai"
              value={note}
              onChange={e => setNote(e.target.value)}
              data-testid="input-expense-note"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Jour</label>
            <div className="flex flex-wrap gap-1.5">
              {days.map(d => {
                const isActive = dayNumber === d.dayNumber;
                return (
                  <button
                    key={d.dayNumber}
                    onClick={() => setDayNumber(d.dayNumber)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border/50 text-muted-foreground"
                    }`}
                    data-testid={`pill-day-${d.dayNumber}`}
                  >
                    J{d.dayNumber}
                  </button>
                );
              })}
            </div>
          </div>

          {hasParticipants && (
            <>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Payé par</label>
                <div className="flex flex-wrap gap-1.5">
                  {participants.map(p => {
                    const isActive = paidBy === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPaidBy(p)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border/50 text-muted-foreground"
                        }`}
                        data-testid={`pill-payer-${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Partager entre</label>
                <p className="text-[10px] text-muted-foreground mb-2">Si personne n'est coché, la dépense est uniquement pour {paidBy}</p>
                <div className="space-y-2">
                  {participants.map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer" data-testid={`checkbox-split-${p}`}>
                      <Checkbox
                        checked={splitWith.includes(p)}
                        onCheckedChange={() => toggleSplit(p)}
                      />
                      <span className="text-sm">{p}</span>
                    </label>
                  ))}
                </div>
                {splitWith.length > 0 && amount && parseFloat(amount) > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 p-2 rounded-md bg-muted/50">
                    {parseFloat(amount).toFixed(2)} / {splitWith.length} = <span className="font-bold text-foreground">{(parseFloat(amount) / splitWith.length).toFixed(2)}</span> par personne
                  </p>
                )}
              </div>
            </>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || isAdding}
            data-testid="button-submit-expense"
          >
            {isAdding ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BalancesCard({ expenses, participants, currency }: { expenses: ExpenseItem[]; participants: string[]; currency: string }) {
  const { balances, settlements } = useMemo(
    () => computeBalances(expenses as LocalExpense[], participants),
    [expenses, participants]
  );

  if (participants.length === 0 || expenses.length === 0) return null;

  return (
    <Card className="p-4" data-testid="card-tricount-balances">
      <h4 className="text-sm font-bold mb-3">Tricount &ndash; Qui doit quoi ?</h4>
      <div className="space-y-2 mb-4">
        {balances.map(b => (
          <div key={b.name} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/20" data-testid={`balance-${b.name}`}>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{b.name}</p>
              <p className="text-[10px] text-muted-foreground">Payé {currency}{b.paid.toFixed(0)} &middot; Part {currency}{b.owes.toFixed(0)}</p>
            </div>
            <span className={`text-sm font-bold shrink-0 ${b.net > 0.01 ? "text-emerald-400" : b.net < -0.01 ? "text-red-400" : "text-muted-foreground"}`}>
              {b.net > 0.01 ? "+" : ""}{currency}{b.net.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      {settlements.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Remboursements</h5>
          <div className="space-y-1.5">
            {settlements.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-md border border-border/30" data-testid={`settlement-${i}`}>
                <span className="font-semibold text-red-400">{s.from}</span>
                <span className="text-muted-foreground flex-1 text-center">&rarr;</span>
                <span className="font-semibold text-emerald-400">{s.to}</span>
                <span className="font-bold text-foreground ml-1">{currency}{s.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function BudgetSection({ trip, expenses, currency, onAddExpense, onDeleteExpense, isAdding, dayCount, participants }: BudgetSectionProps) {
  const summary = useMemo(() => computeBudgetSummary(trip, expenses), [trip, expenses]);
  const alerts = useMemo(() => generateAlerts(summary, currency), [summary, currency]);
  const days = (trip.days || []).map((d: any) => ({ dayNumber: d.dayNumber, city: d.city, dateLabel: d.dateLabel }));
  const activeParticipants = participants && participants.length > 0 ? participants : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold font-display">Budget</h3>
        <AddExpenseModal
          days={days}
          onAdd={onAddExpense}
          isAdding={isAdding}
          participants={activeParticipants.length > 0 ? activeParticipants : undefined}
          trigger={
            <Button size="sm" data-testid="button-add-expense">
              <Plus className="w-4 h-4 mr-1" /> Dépense
            </Button>
          }
        />
      </div>

      <TopSummaryCard summary={summary} currency={currency} />
      {activeParticipants.length > 0 && (
        <BalancesCard expenses={expenses} participants={activeParticipants} currency={currency} />
      )}
      <CumulativeChart summary={summary} currency={currency} />
      <CategoryBreakdown summary={summary} currency={currency} />
      <SmartAlerts alerts={alerts} />
      <DayByDayBars summary={summary} currency={currency} />
      <AverageProjection summary={summary} currency={currency} />
      <ExpenseHistory expenses={expenses} currency={currency} onDelete={onDeleteExpense} dayData={summary.dayData} />
    </div>
  );
}
