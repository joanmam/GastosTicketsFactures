import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/server-auth";
import { extractTicketData } from "@/lib/anthropic";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { imageBase64, mediaType } = body as {
      imageBase64?: string;
      mediaType?: string;
    };

    if (!imageBase64 || !mediaType) {
      return NextResponse.json(
        { error: "Cal una imatge (imageBase64) i el tipus (mediaType)." },
        { status: 400 }
      );
    }

    // Si el client envia una data URL completa (data:image/jpeg;base64,xxxx),
    // l'API d'Anthropic necessita només la part en base64.
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

    const data = await extractTicketData(cleanBase64, mediaType);

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("Error extracting ticket:", err);
    return NextResponse.json(
      { error: err?.message || "Error extraient les dades del ticket." },
      { status: 500 }
    );
  }
}
