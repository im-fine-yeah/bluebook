import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const codePattern = /^[AB]{4}$/;
const digest = value => createHash("sha256").update(value).digest();
const reply = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export default async function handler(request) {
  try {
    if (request.method === "POST") {
      const body = await request.text();
      if (body.length > 256) return reply({}, 413);
      let entry;
      try { entry = JSON.parse(body); } catch { return reply({}, 400); }
      if (typeof entry?.id !== "string" || !/^[a-f0-9]{32}$/.test(entry.id) ||
          typeof entry.code !== "string" || !codePattern.test(entry.code)) {
        return reply({}, 400);
      }
      const store = getStore({ name: "quiz-first-results", consistency: "strong" });
      await store.set(entry.id, entry.code, { onlyIfNew: true });
      return reply({ saved: true });
    }

    if (request.method !== "GET") return reply({}, 405);
    const password = process.env.QUIZ_STATS_PASSWORD;
    if (!password) return reply({ error: "统计密码尚未配置" }, 503);
    const supplied = request.headers.get("Authorization") ?? "";
    if (!timingSafeEqual(digest(supplied), digest("Bearer " + password))) {
      return reply({ error: "密码不正确" }, 401);
    }

    const store = getStore({ name: "quiz-first-results", consistency: "strong" });
    const { blobs } = await store.list();
    const counts = {};
    for (let offset = 0; offset < blobs.length; offset += 24) {
      const codes = await Promise.all(blobs.slice(offset, offset + 24).map(blob => store.get(blob.key)));
      for (const code of codes) {
        if (typeof code === "string" && codePattern.test(code)) counts[code] = (counts[code] ?? 0) + 1;
      }
    }
    return reply({ counts });
  } catch (error) {
    console.error("Quiz statistics request failed", error.name);
    return reply({ error: "暂时无法读取或保存统计，请重试" }, 503);
  }
}
