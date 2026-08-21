"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PIE_COLORS = ["#d2645a", "#7d9a6c", "#d68f2e", "#8a7761", "#b84e45"];

export type MonthlyPoint = { month: string; raised: number; spent: number };
export type CategoryPoint = { category: string; amount: number };
export type EventNetPoint = { name: string; net: number };

export function BudgetCharts({
  monthly,
  categories,
  eventNet,
}: {
  monthly: MonthlyPoint[];
  categories: CategoryPoint[];
  eventNet: EventNetPoint[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="pop-card bg-paper-raised rounded-2xl p-5">
        <h3 className="font-display text-lg text-ink mb-3">Raised vs. spent by month</h3>
        {monthly.length === 0 ? (
          <p className="text-sm text-ink-soft py-8 text-center">
            Not enough data yet to chart this.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7d9be" />
              <XAxis dataKey="month" tick={{ fill: "#8a7761", fontSize: 12 }} />
              <YAxis tick={{ fill: "#8a7761", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#fffbf3",
                  border: "2px solid #4a3728",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="raised"
                name="Raised"
                fill="#7d9a6c"
                stroke="#4a3728"
                strokeWidth={1.5}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="spent"
                name="Spent"
                fill="#d2645a"
                stroke="#4a3728"
                strokeWidth={1.5}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pop-card bg-paper-raised rounded-2xl p-5">
        <h3 className="font-display text-lg text-ink mb-3">Spending by category</h3>
        {categories.length === 0 ? (
          <p className="text-sm text-ink-soft py-8 text-center">
            Log a purchase to see the breakdown.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categories}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={75}
              >
                {categories.map((_, i) => (
                  <Cell
                    key={i}
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                    stroke="#4a3728"
                    strokeWidth={1.5}
                  />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#fffbf3",
                  border: "2px solid #4a3728",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pop-card bg-paper-raised rounded-2xl p-5 lg:col-span-2">
        <h3 className="font-display text-lg text-ink mb-3">Amount raised by event</h3>
        {eventNet.length === 0 ? (
          <p className="text-sm text-ink-soft py-8 text-center">
            Add an event with some numbers to see this.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eventNet}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7d9be" />
              <XAxis dataKey="name" tick={{ fill: "#8a7761", fontSize: 12 }} />
              <YAxis tick={{ fill: "#8a7761", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#fffbf3",
                  border: "2px solid #4a3728",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Bar
                dataKey="net"
                name="Amount raised"
                fill="#d68f2e"
                stroke="#4a3728"
                strokeWidth={1.5}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
