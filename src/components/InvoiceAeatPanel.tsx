"use client";

import { AEAT_STATUSES, AEAT_STATUS_COLOR } from "@/lib/invoice-constants";
import type { AeatInfo, AeatStatus } from "@/types";
import FileInput from "@/components/FileInput";

interface InvoiceAeatPanelProps {
  aeat: AeatInfo;
  onChange: (aeat: AeatInfo) => void;
  onPdfSelected: (base64: string, mediaType: string) => void;
  onQrSelected: (base64: string, mediaType: string) => void;
  pdfSelectedName?: string | null;
  qrSelectedName?: string | null;
}

export default function InvoiceAeatPanel({
  aeat,
  onChange,
  onPdfSelected,
  onQrSelected,
}: InvoiceAeatPanelProps) {
  function update<K extends keyof AeatInfo>(key: K, value: AeatInfo[K]) {
    onChange({ ...aeat, [key]: value });
  }

  const current = AEAT_STATUSES.find((s) => s.value === aeat.status) || AEAT_STATUSES[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900">Document oficial AEAT</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/aplicacion-gratuita-verifactu-aeat/emision-facturas.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            🔗 Obrir VERI*FACTU (AEAT)
          </a>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${AEAT_STATUS_COLOR[aeat.status]}`}>
            {current.icon} {current.label}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Recorda: la factura oficial sempre és la que genera la Sede Electrònica de la AEAT (VERI*FACTU). Aquesta app
        només serveix de control intern.
      </p>

      <div>
        <label htmlFor="aeatStatus">Estat del document AEAT</label>
        <select id="aeatStatus" value={aeat.status} onChange={(e) => update("status", e.target.value as AeatStatus)}>
          {AEAT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.icon} {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="csv">Codi CSV (codi segur de verificació)</label>
          <input
            id="csv"
            type="text"
            value={aeat.csv || ""}
            onChange={(e) => update("csv", e.target.value)}
            placeholder="Ex: A1B2C3D4E5F6G7H8"
          />
        </div>
        <div>
          <label htmlFor="generatedDate">Data de generació a la AEAT</label>
          <input
            id="generatedDate"
            type="date"
            value={aeat.generatedDate || ""}
            onChange={(e) => update("generatedDate", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="verificationUrl">URL de verificació de la AEAT</label>
          <input
            id="verificationUrl"
            type="text"
            value={aeat.verificationUrl || ""}
            onChange={(e) => update("verificationUrl", e.target.value)}
            placeholder="https://www2.agenciatributaria.gob.es/..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileInput
          label="Adjuntar PDF oficial AEAT"
          accept="application/pdf"
          currentUrl={aeat.pdfUrl}
          currentName="PDF AEAT"
          onFileSelected={onPdfSelected}
        />
        <FileInput
          label="Adjuntar imatge del QR"
          accept="image/*"
          currentUrl={aeat.qrUrl}
          currentName="QR"
          onFileSelected={onQrSelected}
        />
      </div>
    </div>
  );
}
