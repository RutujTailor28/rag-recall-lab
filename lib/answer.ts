// Deterministic extractive answerer — the "mock" generator.
//
// It selects the sentences from the retrieved chunks that best cover the
// question and stitches them into a grounded answer with inline [n] citations
// that match the source-card numbers. No secrets, no network.

import { tokenize } from "./tokenize";
import type { Source } from "./types";

const SENT_SPLIT = /(?<=[.!?])\s+/;

export function composeAnswer(question: string, sources: Source[]): string {
  if (sources.length === 0) {
    return "I couldn't find anything relevant in the indexed documents.";
  }

  const qTerms = new Set(tokenize(question));
  const scored: { score: number; rank: number; sent: string }[] = [];

  sources.forEach((src, i) => {
    const rank = i + 1;
    for (const raw of src.text.split(SENT_SPLIT)) {
      const sent = raw.trim();
      if (sent.length < 20) continue;
      const sTerms = new Set(tokenize(sent));
      if (sTerms.size === 0) continue;
      let overlap = 0;
      for (const t of qTerms) if (sTerms.has(t)) overlap++;
      if (overlap === 0) continue;
      scored.push({ score: overlap / (qTerms.size || 1), rank, sent });
    }
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  if (top.length === 0) {
    const first = sources[0].text.split(SENT_SPLIT)[0].trim();
    return `${first} [1]`;
  }

  // Preserve citation order by source rank for readability.
  top.sort((a, b) => a.rank - b.rank);
  return top.map((t) => `${t.sent} [${t.rank}]`).join(" ");
}
