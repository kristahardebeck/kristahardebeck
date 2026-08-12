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
import { SEGMENTS } from "@/lib/data";
import { count, currency, currencyCompact, percent } from "@/lib/format";

/**
 * Segments are an ordered scale (Grassroots → Principal), so this is an ordinal
 * ramp of one hue rather than five categorical colors: the darkening step is the
 * magnitude, and no reader has to learn a color key.
 *
 * Ramp steps stay inside the ordinal floor — nothing lighter than step 250 on
 * the light surface, nothing darker than step 600 on dark.
 */
const RAMP = [
  "var(--seq-6)",
  "var(--seq-5)",
  "var(--seq-4)",
  "var(--seq-3)",
  "var(--seq-2)",
];

const rows = SEGMENTS.map((s, i) => ({
  ...s,
  color: RAMP[i],
  avg: Math.round(s.revenue / s.donors),
}));

function SegmentTooltip(props: {
  active?: boolean;
  payload?: Array<{ payload?: (typeof rows)[number] }>;
}) {
  const { active, payload } = props;
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <TooltipBox
      title={`${row.name} · ${row.range}`}
      rows={[
        { label: "Revenue", value: currency(row.revenue), color: row.color },
        { label: "Donors", value: count(row.donors) },
        { label: "Average gift", value: currency(row.avg) },
        { label: "Retention", value: percent(row.retention, 0) },
      ]}
    />
  );
}

function SegmentTick(props: { x?: number; y?: number; payload?: { value?: string } }) {
  const { x = 0, y = 0, payload } = props;
  const row = rows.find((r) => r.name === payload?.value);
  if (!row) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={-4} textAnchor="end" fill="var(--text-primary)" fontSize={12.5} fontWeight={600}>
        {row.name}
      </text>
      <text x={-10} y={11} textAnchor="end" fill="var(--text-muted)" fontSize={11}>
        {count(row.donors)} donors · {percent(row.retention, 0)} kept
      </text>
    </g>
  );
}

export default function SegmentChart() {
  return (
    <ChartCard
      title="Revenue by Donor Segment"
      subtitle="Seven principal donors out-give 6,842 grassroots donors — and retain at 100% against their 38%."
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Segment</th>
              <th>Gift range</th>
              <th className="num">Donors</th>
              <th className="num">Revenue</th>
              <th className="num">Avg gift</th>
              <th className="num">Retention</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{s.range}</td>
                <td className="num">{count(s.donors)}</td>
                <td className="num">{currency(s.revenue)}</td>
                <td className="num">{currency(s.avg)}</td>
                <td className="num">{percent(s.retention, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div style={{ width: "100%", flex: 1, minHeight: 300 }}>
        <ResponsiveContainer>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 62, bottom: 4, left: 8 }}
            barCategoryGap="26%"
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
              // Wide enough for the longest sub-label ("6,842 donors · 38% kept");
              // anything narrower silently clips the leading digits off the count.
              width={176}
              tickLine={false}
              axisLine={false}
              tick={<SegmentTick />}
            />
            <Tooltip content={<SegmentTooltip />} cursor={{ fill: "var(--accent-wash)" }} />
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
