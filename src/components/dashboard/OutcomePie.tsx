"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  accepted: "#10b981",   // success
  rejected: "#ef4444",   // error
  no_match: "#f59e0b",   // warning
  ineligible: "#475569", // slate
  abandoned: "#4d65ff",  // primary
};

const LABELS: Record<string, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  no_match: "No match",
  ineligible: "Ineligible",
  abandoned: "Abandoned",
};

export function OutcomePie({ data }: { data: Array<{ outcome: string; n: number }> }) {
  if (!data.length) return <div className="empty">No call outcomes yet.</div>;
  const rows = data.map((d) => ({ ...d, name: LABELS[d.outcome] ?? d.outcome }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="n"
          nameKey="name"
          innerRadius={56}
          outerRadius={90}
          paddingAngle={2}
          stroke="none"
          label={({ value }) => value}
        >
          {rows.map((entry) => (
            <Cell key={entry.outcome} fill={COLORS[entry.outcome] ?? "#475569"} />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 12, color: "#475569" }}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
