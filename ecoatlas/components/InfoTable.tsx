import type { ReactNode } from "react";

type InfoTableRow = {
  label: string;
  value: ReactNode;
};

type InfoTableProps = {
  rows: InfoTableRow[];
};

export default function InfoTable({ rows }: InfoTableProps) {
  return (
    <div>
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className={`flex items-start justify-between gap-3 py-1.5 ${
            index === 0 ? "" : "border-t border-white/10"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            {row.label}
          </div>
          <div className="text-right text-sm text-slate-100">{row.value}</div>
        </div>
      ))}
    </div>
  );
}
