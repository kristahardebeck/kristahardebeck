"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard, { TooltipBox } from "./ChartCard";
import { DONOR_MOVEMENT } from "@/lib/data";
import { count } from "@/lib/format";

const SERIES = [
  { key: "retained", label: "Retained", color: "var(--series-1)" },
  { key: "acquired", label: "Newly acquired", color: "var(--series-2)" },
  { key: "reactivated", label: "Reactivated", color: "var(--series-3)" },
] as const;

const rows = DONOR_MOVEMENT.map((r) => ({
  ...r,
  total: r.retained + r.acquired + r.reactivated,
}));

/** Stack total, printed once above each bar. */
function TotalLabel(props: {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  index?: number;
}) {
  const { x = 0, y = 0, width = 0, index = 0 } = props;
  const row = rows[index];
  const cx = Number(x);
  const cy = Number(y);
  const w = Number(width);
  if (!row || !Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
  return (
    <text
      x={cx + w / 2}
      y={cy - 8}
      textAnchor="middle"
      fill="var(--text-secondary)"
      fontSize={12}
      fontWeight={600}
    >
      {count(row.total)}
    </text>
  );
}

function MovementTooltip(props: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ dataKey?: string | number; value?: number; payload?: (typeof rows)[number] }>;
}) {
  const { active, label, payload } = props;
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;

  return (
    <TooltipBox
      title={String(label)}
      rows={[
        ...SERIES.map((s) => ({
          label: s.label,
          color: s.color,
          value: count(payload.find((p) => p.dataKey === s.key)?.value ?? 0),
        })),
        { label: "On file", value: count(row?.total ?? 0) },
        { label: "Lapsed this year", value: count(row?.lapsed ?? 0) },
      ]}
    />
  );
}

export default function DonorMovement() {
  return (
    <ChartCard
      title="Donor File Movement"
      subtitle="The file keeps growing. Half-year acquisition looks low against a full prior year, but the first half only carries ~38% of annual activity — it is running ahead of seasonal pace."
      legend={SERIES.map((s) => ({ label: s.label, color: s.color }))}
      table={
        <table className="data-table">
          <thead>
            <tr>
              <th>Year</th>
              <th className="num">Retained</th>
              <th className="num">Newly acquired</th>
              <th className="num">Reactivated</th>
              <th className="num">On file</th>
              <th className="num">Lapsed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <td>{r.year}</td>
                <td className="num">{count(r.retained)}</td>
                <td className="num">{count(r.acquired)}</td>
                <td className="num">{count(r.reactivated)}</td>
                <td className="num">{count(r.total)}</td>
                <td className="num">{count(r.lapsed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div style={{ width: "100%", flex: 1, minHeight: 300 }}>
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 4, left: 4 }} barCategoryGap="30%">
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
            />
            <YAxis
              tickFormatter={(v: number) => count(v)}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={54}
            />
            <Tooltip content={<MovementTooltip />} cursor={{ fill: "var(--accent-wash)" }} />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="donors"
                fill={s.color}
                // 2px surface stroke = the gap between stacked segments
                stroke="var(--surface)"
                strokeWidth={2}
                radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              >
                {i === SERIES.length - 1 && <LabelList content={<TotalLabel />} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
