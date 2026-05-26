import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const KV_KEY = "nextgen-wordcloud";

function getRedis() {
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

export async function GET() {
  try {
    const redis = getRedis();
    const words = await redis.get(KV_KEY);
    return NextResponse.json(words || {});
  } catch (e) {
    console.error("GET error:", e);
    return NextResponse.json({});
  }
}

export async function POST(request) {
  try {
    const { word } = await request.json();
    const normalized = word
      .trim()
      .toLowerCase()
      .replace(/[^a-záàâãéèêíïóôõúüçñ\s-]/gi, "")
      .slice(0, 30);

    if (!normalized || normalized.length < 2) {
      return NextResponse.json({ error: "Invalid word" }, { status: 400 });
    }

    const redis = getRedis();
    const current = (await redis.get(KV_KEY)) || {};
    current[normalized] = (current[normalized] || 0) + 1;
    await redis.set(KV_KEY, current);

    return NextResponse.json(current);
  } catch (e) {
    console.error("POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const redis = getRedis();
    await redis.set(KV_KEY, {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
