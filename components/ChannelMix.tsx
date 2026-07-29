"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard, { TooltipBox } from "./ChartCard";
import { CHANNELS } from "@/lib/data";
import { count, currency, currencyCompact } from "@/lib/format";

const RAMP = [
  "var(--seq-1)",
  "var(--seq-2)",
  "var(--seq-3)",
  "var(--seq-4)",
  "var(--seq-5)",
  "var(--seq-6)",
];

const total = CHANNELS.reduce((sum, c) => sum + c.revenue, 0);

const rows = [...CHANNELS]
  .sort((a, b) => b.revenue - a.revenue)
  .map((c, i) => ({
    ...c,
    color: RAMP[i],
    share: c.revenue / total,
    avgGift: Math.round(c.revenue / c.gifts),
  }));

function ChannelTooltip(props: {
  active?: boolean;
  payload?: Array<{ payload?: (typeof rows)[number] }>;
}) {
  const { active, payload } = props;
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <TooltipBox
      title={row.name}
      rows={[
        { label: "Revenue", value: currency(row.revenue), color: row.color },
        { label: "Share of total", value: `${(row.share * 100).toFixed(1)}%` },
        { label: "Gifts", value: count(row.gifts) },
        { label: "Average gift", value: currency(row.avgGift) },
      ]}
    />
  );
}

export default function ChannelMix() {
  return (
    <ChartCard
      title="Revenue by channel"
      subtitle="Trailing twelve months. Major gifts produce a third of all revenue from 118 gifts."
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th className="num">Revenue</th>
              <th className="num">Share</th>
              <th className="num">Gifts</th>
              <th className="num">Avg gift</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td className="num">{currency(c.revenue)}</td>
                <td className="num">{(c.share * 100).toFixed(1)}%</td>
                <td className="num">{count(c.gifts)}</td>
                <td className="num">{currency(c.avgGift)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div style={{ width: "100%", flex: 1, minHeight: 288 }}>
        <ResponsiveContainer>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 62, bottom: 4, left: 8 }}
            barCategoryGap="24%"
          >
            <CartesianGrid stroke="var(--grid)" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => currencyCompact(v)}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={164}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-primary)", fontSize: 12.5 }}
            />
            <Tooltip content={<ChannelTooltip />} cursor={{ fill: "var(--accent-wash)" }} />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.name} fill={r.color} />
              ))}
              <LabelList
                dataKey="revenue"
                position="right"
                offset={9}
                formatter={(v) => (typeof v === "number" ? currencyCompact(v) : "")}
                style={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
