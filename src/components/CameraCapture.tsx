"use client";

import { useRef, useState } from "react";

interface CameraCaptureProps {
  imagePreviewUrl?: string | null;
  onImageSelected: (base64: string, mediaType: string, previewUrl: string) => void;
}

const MAX_DIMENSION = 1600;

function fileToResizedDataUrl(file: File): Promise<{ dataUrl: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No s'ha pogut llegir el fitxer."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No s'ha pogut llegir la imatge."));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No s'ha pogut processar la imatge."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mediaType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mediaType, 0.85);
        resolve({ dataUrl, mediaType });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function CameraCapture({ imagePreviewUrl, onImageSelected }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const { dataUrl, mediaType } = await fileToResizedDataUrl(file);
      onImageSelected(dataUrl, mediaType, dataUrl);
    } catch (err: any) {
      setError(err?.message || "Error processant la imatge.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {imagePreviewUrl && (
        <img
          src={imagePreviewUrl}
          alt="Vista prèvia del ticket"
          className="w-full max-h-80 object-contain rounded-md border border-gray-200 bg-white"
        />
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => cameraInputRef.current?.click()}>
          📷 Fer foto
        </button>
        <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
          🗂️ Pujar fitxer
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
