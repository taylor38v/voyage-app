export const CATEGORIES = ["hotel", "food", "transport", "activities", "other"] as const;
export type BudgetCategory = typeof CATEGORIES[number];

export const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  hotel: "Hébergement",
  food: "Nourriture",
  transport: "Transport",
  activities: "Activités",
  other: "Autre",
};

export const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  hotel: "#a855f7",
  food: "#f97316",
  transport: "#3b82f6",
  activities: "#10b981",
  other: "#9ca3af",
};

export const CATEGORY_BG: Record<BudgetCategory, string> = {
  hotel: "bg-purple-500",
  food: "bg-orange-500",
  transport: "bg-blue-500",
  activities: "bg-emerald-500",
  other: "bg-gray-400",
};

export interface LocalExpense {
  id: string;
  dayNumber: number | null;
  category: string;
  amount: string;
  note: string | null;
  createdAt: string;
  paidBy?: string;
  splitWith?: string[];
}

export interface ParticipantBalance {
  name: string;
  paid: number;
  owes: number;
  net: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export function computeBalances(expenses: LocalExpense[], participants: string[]): { balances: ParticipantBalance[]; settlements: Settlement[] } {
  if (participants.length === 0) return { balances: [], settlements: [] };

  const paid: Record<string, number> = {};
  const owes: Record<string, number> = {};
  participants.forEach(p => { paid[p] = 0; owes[p] = 0; });

  expenses.forEach(exp => {
    const amount = parseFloat(exp.amount) || 0;
    if (amount <= 0) return;
    const payer = exp.paidBy || participants[0];
    if (!paid[payer]) paid[payer] = 0;
    paid[payer] += amount;

    const splitPeople = exp.splitWith && exp.splitWith.length > 0 ? exp.splitWith : [payer];
    const share = amount / splitPeople.length;
    splitPeople.forEach(p => {
      if (!owes[p]) owes[p] = 0;
      owes[p] += share;
    });
  });

  const balances: ParticipantBalance[] = participants.map(name => ({
    name,
    paid: paid[name] || 0,
    owes: owes[name] || 0,
    net: (paid[name] || 0) - (owes[name] || 0),
  }));

  const debtors = balances.filter(b => b.net < 0).map(b => ({ name: b.name, amount: Math.abs(b.net) })).sort((a, b) => b.amount - a.amount);
  const creditors = balances.filter(b => b.net > 0).map(b => ({ name: b.name, amount: b.net })).sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const transfer = Math.min(debtors[di].amount, creditors[ci].amount);
    if (transfer > 0.01) {
      settlements.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(transfer * 100) / 100 });
    }
    debtors[di].amount -= transfer;
    creditors[ci].amount -= transfer;
    if (debtors[di].amount < 0.01) di++;
    if (creditors[ci].amount < 0.01) ci++;
  }

  return { balances, settlements };
}

export interface DayBudgetData {
  dayNumber: number;
  city: string;
  color: string;
  dateLabel: string;
  planned: number;
  actual: number;
  byCategory: Record<BudgetCategory, { planned: number; actual: number }>;
}

export interface BudgetSummary {
  totalBudget: number;
  totalPlanned: number;
  totalActual: number;
  categoryTotals: Record<BudgetCategory, { planned: number; actual: number }>;
  dayData: DayBudgetData[];
  cumulativeData: { day: number; label: string; planned: number; actual: number }[];
  avgPlannedPerDay: number;
  avgActualPerDay: number;
  daysElapsed: number;
  projection: number;
}

export function computeBudgetSummary(
  trip: any,
  expenseList: { dayNumber?: number | null; category: string; amount: string | number }[]
): BudgetSummary {
  const days = trip.days || [];
  const tripCategorySum = (trip.budgetHotel || 0) + (trip.budgetFood || 0) + (trip.budgetTransport || 0) + (trip.budgetActivities || 0) + (trip.budgetOther || 0);
  const hasTripBudgets = tripCategorySum > 0;
  const totalBudget = hasTripBudgets ? tripCategorySum : (trip.totalBudget || 0);
  const totalDays = days.length;

  const categoryTotals: Record<BudgetCategory, { planned: number; actual: number }> = {} as any;
  if (hasTripBudgets) {
    categoryTotals.hotel = { planned: trip.budgetHotel || 0, actual: 0 };
    categoryTotals.food = { planned: trip.budgetFood || 0, actual: 0 };
    categoryTotals.transport = { planned: trip.budgetTransport || 0, actual: 0 };
    categoryTotals.activities = { planned: trip.budgetActivities || 0, actual: 0 };
    categoryTotals.other = { planned: trip.budgetOther || 0, actual: 0 };
  } else {
    CATEGORIES.forEach(c => { categoryTotals[c] = { planned: 0, actual: 0 }; });
  }

  const dayData: DayBudgetData[] = days.map((day: any) => {
    const byCategory: Record<BudgetCategory, { planned: number; actual: number }> = {} as any;
    let dayPlanned = 0;
    CATEGORIES.forEach(c => {
      const planned = parseFloat(day.budget?.[c] || "0");
      byCategory[c] = { planned, actual: 0 };
      dayPlanned += planned;
      if (!hasTripBudgets) {
        categoryTotals[c].planned += planned;
      }
    });
    return {
      dayNumber: day.dayNumber,
      city: day.city,
      color: day.color || "#FF6B6B",
      dateLabel: day.dateLabel,
      planned: dayPlanned,
      actual: 0,
      byCategory,
    };
  });

  expenseList.forEach(exp => {
    const amount = typeof exp.amount === "string" ? parseFloat(exp.amount) : exp.amount;
    if (isNaN(amount)) return;
    const cat = (CATEGORIES.includes(exp.category as BudgetCategory) ? exp.category : "other") as BudgetCategory;
    categoryTotals[cat].actual += amount;

    if (exp.dayNumber) {
      const dd = dayData.find(d => d.dayNumber === exp.dayNumber);
      if (dd) {
        dd.actual += amount;
        dd.byCategory[cat].actual += amount;
      }
    }
  });

  const totalPlanned = CATEGORIES.reduce((s, c) => s + categoryTotals[c].planned, 0);
  const totalActual = CATEGORIES.reduce((s, c) => s + categoryTotals[c].actual, 0);

  let cPlanned = 0;
  let cActual = 0;
  const cumulativeData = dayData.map(d => {
    cPlanned += d.planned;
    cActual += d.actual;
    return { day: d.dayNumber, label: `J${d.dayNumber}`, planned: cPlanned, actual: cActual };
  });

  const daysWithExpensesMap: Record<string, boolean> = {};
  expenseList.forEach(e => { if (e.dayNumber) daysWithExpensesMap[String(e.dayNumber)] = true; });
  const daysWithExpenses = Object.keys(daysWithExpensesMap).length;
  const daysElapsed = Math.max(daysWithExpenses, 1);
  const avgPlannedPerDay = totalDays > 0 ? totalPlanned / totalDays : 0;
  const avgActualPerDay = daysElapsed > 0 ? totalActual / daysElapsed : 0;
  const projection = totalDays > 0 ? avgActualPerDay * totalDays : 0;

  return {
    totalBudget,
    totalPlanned,
    totalActual,
    categoryTotals,
    dayData,
    cumulativeData,
    avgPlannedPerDay,
    avgActualPerDay,
    daysElapsed,
    projection,
  };
}

export interface BudgetAlert {
  type: "warning" | "success" | "info";
  message: string;
}

export function generateAlerts(summary: BudgetSummary, currency: string): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  const { totalPlanned, totalActual, categoryTotals, dayData, avgActualPerDay, daysElapsed } = summary;

  if (totalActual === 0) return alerts;

  CATEGORIES.forEach(cat => {
    const { planned, actual } = categoryTotals[cat];
    if (planned > 0 && actual > planned) {
      const over = actual - planned;
      alerts.push({
        type: "warning",
        message: `${CATEGORY_LABELS[cat]} : dépassement de ${currency}${over.toFixed(0)}`,
      });
    }
  });

  CATEGORIES.forEach(cat => {
    const { planned, actual } = categoryTotals[cat];
    if (planned > 0 && actual > 0 && actual <= planned * 0.85) {
      const pctBelow = Math.round((1 - actual / planned) * 100);
      alerts.push({
        type: "success",
        message: `${CATEGORY_LABELS[cat]} : ${pctBelow}% en dessous du budget`,
      });
    }
  });

  const totalDays = dayData.length;
  const remaining = totalDays - daysElapsed;
  if (remaining > 0 && totalActual > 0) {
    const projectedRemaining = avgActualPerDay * remaining;
    const projectedTotal = totalActual + projectedRemaining;
    if (projectedTotal > totalPlanned * 1.1) {
      alerts.push({
        type: "warning",
        message: `À ce rythme, total estimé : ${currency}${projectedTotal.toFixed(0)} sur ${currency}${totalPlanned.toFixed(0)} prévus`,
      });
    } else {
      const leftover = totalPlanned - projectedTotal;
      alerts.push({
        type: "info",
        message: `À ce rythme, il restera ~${currency}${Math.max(0, leftover).toFixed(0)} pour les ${remaining} derniers jours`,
      });
    }
  }

  return alerts;
}
