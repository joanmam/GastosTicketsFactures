"use client";

import { useState } from "react";

const QUARTERS = [
  { q: 1, label: "1T", months: [1, 2, 3] },
  { q: 2, label: "2T", months: [4, 5, 6] },
  { q: 3, label: "3T", months: [7, 8, 9] },
  { q: 4, label: "4T", months: [10, 11, 12] },
];

interface QuarterFilterProps {
  /** Trimestre actiu en format "YYYY-Q" (p.ex. "2025-2"), o "" per cap */
  value: string;
  onChange: (value: string) => void;
}

export default function QuarterFilter({ value, onChange }: QuarterFilterProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(() => {
    if (value) return parseInt(value.split("-")[0]);
    return currentYear;
  });

  const activeQ = value ? parseInt(value.split("-")[1]) : null;
  const activeY = value ? parseInt(value.split("-")[0]) : null;

  function selectQuarter(q: number) {
    const key = `${year}-${q}`;
    if (activeY === year && activeQ === q) {
      onChange(""); // deseleccionar
    } else {
      onChange(key);
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Selector d'any */}
      <button
        type="button"
        onClick={() => setYear((y) => y - 1)}
        className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-900 rounded"
        title="Any anterior"
      >
        ‹
      </button>
      <span className="text-xs font-medium text-gray-600 w-10 text-center">{year}</span>
      <button
        type="button"
        onClick={() => setYear((y) => y + 1)}
        className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-900 rounded"
        title="Any següent"
      >
        ›
      </button>

      {/* Pills de trimestre */}
      {QUARTERS.map(({ q, label }) => {
        const active = activeY === year && activeQ === q;
        return (
          <button
            key={q}
            type="button"
            onClick={() => selectQuarter(q)}
            className={`px-3 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              active
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-brand-400 hover:text-brand-600"
            }`}
          >
            {label}
          </button>
        );
      })}

      {/* Botó netejar */}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-gray-400 hover:text-gray-700 ml-1"
          title="Treure filtre"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** Converteix "YYYY-Q" a rang de dates {from, to} per a la pàgina de Compres */
export function quarterToDateRange(value: string): { from: string; to: string } | null {
  if (!value) return null;
  const [y, q] = value.split("-").map(Number);
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(y, endMonth, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${y}-${pad(startMonth)}-01`,
    to: `${y}-${pad(endMonth)}-${lastDay}`,
  };
}
