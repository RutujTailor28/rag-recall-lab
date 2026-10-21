import { describe, expect, it } from "vitest";
import { QA, evaluate } from "@/lib/metrics";

describe("evaluate", () => {
  const data = evaluate(5, 800, 120);

  it("reports one metric row per retrieval config", () => {
    expect(data.results).toHaveLength(4);
    expect(data.num_questions).toBe(QA.length);
    expect(data.k).toBe(5);
  });

  it("keeps recall@5 and MRR within [0, 1]", () => {
    for (const r of data.results) {
      expect(r.recall_at_5).toBeGreaterThanOrEqual(0);
      expect(r.recall_at_5).toBeLessThanOrEqual(1);
      expect(r.mrr).toBeGreaterThanOrEqual(0);
      expect(r.mrr).toBeLessThanOrEqual(1);
      // MRR can never exceed recall@5: a hit is required to earn reciprocal rank.
      expect(r.mrr).toBeLessThanOrEqual(r.recall_at_5 + 1e-9);
    }
  });

  it("is deterministic across runs", () => {
    const again = evaluate(5, 800, 120);
    expect(again.results).toEqual(data.results);
  });

  it("produces retrieval that beats an empty baseline", () => {
    // The hybrid config should surface a relevant chunk for most questions.
    const hybrid = data.results.find((r) => r.config === "hybrid")!;
    expect(hybrid.recall_at_5).toBeGreaterThan(0.5);
  });

  it("responds to the chunk-size knob", () => {
    const small = evaluate(5, 400, 60);
    const large = evaluate(5, 1200, 180);
    // Different chunking changes at least one metric somewhere.
    expect(small.results).not.toEqual(large.results);
  });
});
