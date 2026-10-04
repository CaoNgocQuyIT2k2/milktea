export type DayReport = { id: string; day: number; closedAt: string; revenue: number; ingredientCost: number; fixedCost: number; profit: number; openingCash: number; closingCash: number; served: number; missed: number; rent?: number; tax?: number; grossSales?: number; recoveredDebt?: number; defaultedDebt?: number };

export function closeTeaDay(day: number, cash: number, revenue: number, served = 0, missed = 0, options: { monthRevenue?: number; grossSales?: number } = {}): DayReport {
  const ingredientCost = Math.round((options.grossSales ?? revenue) * .38);
  const fixedCost = 25_000;
  const rent = day % 30 === 0 ? 300_000 : 0;
  const tax = day % 30 === 0 ? Math.round((options.monthRevenue ?? revenue) * .05) : 0;
  return { id: `${Date.now()}-${day}`, day, closedAt: new Date().toISOString(), revenue, ingredientCost, fixedCost, rent, tax, grossSales: options.grossSales ?? revenue,
    profit: revenue - ingredientCost - fixedCost - rent - tax, openingCash: cash - revenue,
    // Revenue was already credited when the player served each cup.
    closingCash: cash - ingredientCost - fixedCost - rent - tax, served, missed };
}
