import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKER_URL = process.env.WA_WORKER_URL || "http://localhost:3001";
const WORKER_TOKEN = process.env.WA_WORKER_TOKEN || "";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const r = await fetch(`${WORKER_URL}/contatos`, {
      headers: { "x-auth-token": WORKER_TOKEN },
      cache: "no-store",
    });
    if (r.status === 503) {
      return NextResponse.json(
        { error: "WhatsApp não conectado." },
        { status: 503 }
      );
    }
    if (!r.ok) {
      return NextResponse.json(
        { error: "Não foi possível buscar os contatos." },
        { status: 502 }
      );
    }
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Serviço de WhatsApp inacessível." },
      { status: 502 }
    );
  }
}
