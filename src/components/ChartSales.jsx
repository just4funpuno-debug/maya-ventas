import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

/**
 * Componente de gráfico de ventas (lazy loaded).
 * Props:
 *  - data: Array<{ fecha?: string, label?: string, total: number }>
 *  - currency: function para formatear valores
 */
export default function ChartSales({ data = [], currency }) {
  const chartData = (data || []).map(d => ({
    label: d.label ?? d.fecha ?? '',
    total: Number(d.total || 0)
  }));
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f09929" opacity={0.35} />
            <XAxis dataKey="label" stroke="#f09929" tickLine={false} axisLine={false} />
            <YAxis stroke="#f09929" tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v) => currency ? currency(v) : v}
              contentStyle={{ background:'#0f171e', border:'1px solid #f09929', fontSize:12 }}
              cursor={{ fill:'#f0992930' }}
            />
            <Bar dataKey="total" fill="#ffffff" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}