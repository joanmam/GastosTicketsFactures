"use client";

import { CHECKLIST_LABELS } from "@/lib/invoice-constants";
import type { InvoiceChecklist as ChecklistType } from "@/types";

interface InvoiceChecklistProps {
  checklist: ChecklistType;
  onChange: (checklist: ChecklistType) => void;
}

const ORDER: (keyof ChecklistType)[] = [
  "createdInApp",
  "dataEnteredAeat",
  "aeatPdfSaved",
  "sentToClient",
  "paid",
];

export default function InvoiceChecklist({ checklist, onChange }: InvoiceChecklistProps) {
  function toggle(key: keyof ChecklistType) {
    onChange({ ...checklist, [key]: !checklist[key] });
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-900">Checklist de la factura</h3>
      <ul className="space-y-1.5">
        {ORDER.map((key) => (
          <li key={key}>
            <label className="flex items-center gap-2 cursor-pointer mb-0 font-normal">
              <input
                type="checkbox"
                checked={Boolean(checklist[key])}
                onChange={() => toggle(key)}
                className="w-auto"
                disabled={key === "createdInApp"}
              />
              <span className={checklist[key] ? "text-gray-700" : "text-gray-500"}>
                {checklist[key] ? "☑" : "☐"} {CHECKLIST_LABELS[key]}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
