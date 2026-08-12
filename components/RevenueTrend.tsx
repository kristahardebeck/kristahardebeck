"use client";

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard, { TooltipBox } from "./ChartCard";
import { MONTHLY_REVENUE } from "@/lib/data";
import { currency, currencyCompact } from "@/lib/format";

const SERIES = [
  { key: "y2026", label: "2026", color: "var(--series-1)", lastIndex: 5 },
  { key: "y2025", label: "2025", color: "var(--series-2)", lastIndex: 11 },
  { key: "y2024", label: "2024", color: "var(--series-3)", lastIndex: 11 },
] as const;

/** Renders the year name once, at the end of its own line. */
function makeEndLabel(text: string, color: string, lastIndex: number) {
  return function EndLabel(props: {
    x?: string | number;
    y?: string | number;
    index?: number;
  }) {
    const { x, y, index } = props;
    const cx = Number(x);
    const cy = Number(y);
    if (index !== lastIndex || !Number.isFinite(cx) || !Number.isFinite(cy)) {
      return <g />;
    }
    return (
      <text x={cx + 8} y={cy} dy={4} fill={color} fontSize={12} fontWeight={600}>
        {text}
      </text>
    );
  };
}

function RevenueTooltip(props: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string | number; value?: number }>;
}) {
  const { active, label, payload } = props;
  if (!active || !payload?.length) return null;

  const rows = SERIES.map((s) => {
    const hit = payload.find((p) => p.dataKey === s.key);
    return {
      label: s.label,
      color: s.color,
      value: typeof hit?.value === "number" ? currency(hit.value) : "Not yet closed",
    };
  });

  return <TooltipBox title={String(label)} rows={rows} />;
}

export default function RevenueTrend() {
  return (
    <ChartCard
      title="Monthly Revenue"
      subtitle="2026 is tracking ahead of 2025 in every closed month. December carries roughly a quarter of the year."
      legend={SERIES.map((s) => ({ label: s.label, color: s.color, shape: "line" as const }))}
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">2024</th>
              <th className="num">2025</th>
              <th className="num">2026</th>
            </tr>
          </thead>
          <tbody>
            {MONTHLY_REVENUE.map((m) => (
              <tr key={m.month}>
                <td>{m.month}</td>
                <td className="num">{currency(m.y2024)}</td>
                <td className="num">{currency(m.y2025)}</td>
                <td className="num">{m.y2026 === null ? "—" : currency(m.y2026)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div style={{ width: "100%", flex: 1, minHeight: 300 }}>
        <ResponsiveContainer>
          <LineChart data={MONTHLY_REVENUE} margin={{ top: 8, right: 46, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="var(--grid)" strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
            />
            <YAxis
              tickFormatter={(v: number) => currencyCompact(v)}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={54}
            />
            <Tooltip
              content={<RevenueTooltip />}
              cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--surface)" }}
                connectNulls={false}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={s.key}
                  content={makeEndLabel(s.label, s.color, s.lastIndex)}
                />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
