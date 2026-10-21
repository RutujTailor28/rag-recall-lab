// Retrieval fusion + reranking, ported from the lab's reference backend.
//
// Reciprocal Rank Fusion (RRF) blends the dense and lexical rankings without
// calibrating their raw scores — each list contributes 1 / (rrfK + rank). The
// reranker re-scores the fused candidates by query-term coverage and density, a
// deterministic stand-in for a cross-encoder that keeps the demo fully offline.

import { tokenize } from "./tokenize";

export function rrfFuse(
  rankings: number[][],
  rrfK = 60,
  k?: number,
): [number, number][] {
  const scores = new Map<number, number>();
  for (const ranking of rankings) {
    ranking.forEach((idx, rank) => {
      scores.set(idx, (scores.get(idx) ?? 0) + 1 / (rrfK + rank + 1));
    });
  }
  const fused = [...scores.entries()].sort(
    (a, b) => b[1] - a[1] || a[0] - b[0],
  );
  return k != null ? fused.slice(0, k) : fused;
}

export function rerank(
  query: string,
  candidates: [number, string][],
  k: number,
): [number, number][] {
  const qTerms = new Set(tokenize(query));
  if (qTerms.size === 0) {
    return candidates.slice(0, k).map(([idx]) => [idx, 0]);
  }

  const scored: [number, number][] = candidates.map(([idx, text]) => {
    const toks = tokenize(text);
    if (toks.length === 0) return [idx, 0];
    const tokSet = new Set(toks);
    let covered = 0;
    for (const t of qTerms) if (tokSet.has(t)) covered++;
    const coverage = covered / qTerms.size;
    const hits = toks.filter((t) => qTerms.has(t)).length;
    const density = hits / toks.length;
    return [idx, coverage + 0.25 * density];
  });

  scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return scored.slice(0, k);
}
