"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts";

type EquipmentRow = {
  equipment_type: string;
  avg_final_rate: number | null;
  avg_loadboard_rate: number | null;
  n: number;
};

export function EquipmentChart({ data }: { data: EquipmentRow[] }) {
  if (!data.length) return <div className="empty">No equipment data yet.</div>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="equipment_type" stroke="#475569" fontSize={12} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
        <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            fontSize: 12,
          }}
          formatter={(v: number) => `$${Number(v).toFixed(0)}`}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#475569" }} iconType="circle" />
        <Bar dataKey="avg_loadboard_rate" name="Loadboard" fill="#4d65ff" radius={[4, 4, 0, 0]} />
        <Bar dataKey="avg_final_rate" name="Final" fill="#00b5ad" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
