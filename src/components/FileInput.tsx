"use client";

import { useRef, useState } from "react";

interface FileInputProps {
  label: string;
  accept?: string;
  currentUrl?: string | null;
  currentName?: string;
  onFileSelected: (base64: string, mediaType: string) => void;
}

function fileToDataUrl(file: File): Promise<{ dataUrl: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No s'ha pogut llegir el fitxer."));
    reader.onload = () => resolve({ dataUrl: reader.result as string, mediaType: file.type });
    reader.readAsDataURL(file);
  });
}

export default function FileInput({
  label,
  accept = "application/pdf,image/*",
  currentUrl,
  currentName = "Fitxer",
  onFileSelected,
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const { dataUrl, mediaType } = await fileToDataUrl(file);
      onFileSelected(dataUrl, mediaType);
      setSelectedName(file.name);
    } catch (err: any) {
      setError(err?.message || "Error llegint el fitxer.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" className="btn-secondary text-xs" onClick={() => inputRef.current?.click()}>
          📎 {label}
        </button>
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
            Veure {currentName}
          </a>
        )}
        {selectedName && <span className="text-xs text-gray-500">{selectedName}</span>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  );
}
