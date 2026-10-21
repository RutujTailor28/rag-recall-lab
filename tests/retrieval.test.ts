import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/chunking";
import { cosine, embed } from "@/lib/embeddings";
import { rerank, rrfFuse } from "@/lib/search";
import { buildIndex, retrieve, toSources } from "@/lib/retrieval";
import type { RetrievalMode } from "@/lib/types";

describe("chunkText", () => {
  it("returns no chunks for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("splits long text into multiple overlapping chunks", () => {
    const text = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkText(text, 120, 30);
    expect(chunks.length).toBeGreaterThan(1);
    // Consecutive chunks share an overlapping tail/head word.
    const firstTail = chunks[0].split(" ").slice(-1)[0];
    expect(chunks[1].split(" ")).toContain(firstTail);
  });

  it("keeps a single short document in one chunk", () => {
    expect(chunkText("a short sentence here", 800, 120)).toHaveLength(1);
  });
});

describe("embeddings", () => {
  it("is deterministic and L2-normalised", () => {
    const a = embed("hybrid search reciprocal rank fusion");
    const b = embed("hybrid search reciprocal rank fusion");
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(cosine(a, a)).toBeCloseTo(1, 6);
  });

  it("scores related text higher than unrelated text", () => {
    const q = embed("cross encoder reranking precision stage");
    const related = embed(
      "a cross-encoder reranker reorders candidates for precision",
    );
    const unrelated = embed("metadata filtering by author and date range");
    expect(cosine(q, related)).toBeGreaterThan(cosine(q, unrelated));
  });
});

describe("rrfFuse", () => {
  it("ranks an item that appears high in both lists first", () => {
    const fused = rrfFuse([
      [5, 1, 2],
      [1, 9, 5],
    ]);
    expect(fused[0][0]).toBe(1);
  });

  it("truncates to k", () => {
    const fused = rrfFuse([[0, 1, 2, 3, 4]], 60, 2);
    expect(fused).toHaveLength(2);
  });
});

describe("rerank", () => {
  it("ranks the candidate with the best query-term coverage first", () => {
    const query = "reciprocal rank fusion";
    const ranked = rerank(
      query,
      [
        [0, "completely unrelated text about weather"],
        [1, "reciprocal rank fusion combines rankings"],
      ],
      2,
    );
    expect(ranked[0][0]).toBe(1);
  });
});

describe("retrieve over the sample corpus", () => {
  const index = buildIndex(800, 120);
  const modes: RetrievalMode[] = ["dense", "bm25", "hybrid", "hybrid_rerank"];

  it("builds a non-empty index", () => {
    expect(index.chunks.length).toBeGreaterThan(0);
    expect(index.documents).toHaveLength(12);
  });

  it.each(modes)("returns at most top-k ranked sources for %s", (mode) => {
    const ranked = retrieve(index, "how does hybrid search work", mode, 5);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.length).toBeLessThanOrEqual(5);
    const sources = toSources(index, ranked);
    expect(sources[0].rank).toBe(1);
    expect(sources.map((s) => s.rank)).toEqual(
      sources.map((_, i) => i + 1),
    );
  });

  it("surfaces the RRF document for an on-topic hybrid query", () => {
    const ranked = retrieve(
      index,
      "how does reciprocal rank fusion combine rankings",
      "hybrid",
      5,
    );
    const sources = toSources(index, ranked);
    expect(sources.some((s) => s.source === "05-hybrid-search-rrf.md")).toBe(
      true,
    );
  });
});
