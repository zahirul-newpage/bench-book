import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth } from "@/auth";

// Uses the Workers AI binding (env.AI), not the plain REST API — only
// available when running under `wrangler dev` / `npm run preview`, proxied
// to real Cloudflare inference via your `wrangler login` session. No API
// token needed, but plain `npm run dev` won't have this binding.
const WHISPER_MODEL = "@cf/openai/whisper";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }

  let env;
  try {
    ({ env } = getCloudflareContext());
  } catch {
    return NextResponse.json(
      {
        error:
          "Workers AI binding is not available. Run this with `npm run preview` (wrangler/OpenNext), not `npm run dev`.",
      },
      { status: 500 }
    );
  }

  // Keyed by user, not IP — this costs real money per call regardless of who
  // is asking, so the cap is per-account rather than per-network.
  const { success: withinLimit } = await env.TRANSCRIBE_LIMITER.limit({
    key: `transcribe:${session.user.id}`,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Too many transcription requests. Try again in a minute." },
      { status: 429 }
    );
  }

  const audioBytes = Array.from(new Uint8Array(audio));

  const result = await env.AI.run(WHISPER_MODEL, { audio: audioBytes });

  if (!result?.text) {
    return NextResponse.json({ error: "Transcription failed." }, { status: 502 });
  }

  return NextResponse.json({ text: result.text });
}
