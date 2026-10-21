// A compact Okapi BM25 implementation (no external dependency), ported from the
// lab's reference backend. Scores a chunk by how often the query's terms appear
// in it, tempered by how common those terms are across the corpus.

import { tokenize } from "./tokenize";

export class BM25 {
  private k1: number;
  private b: number;
  private docFreqs: Map<string, number>[] = [];
  private docLen: number[] = [];
  private idf: Map<string, number> = new Map();
  private avgdl = 0;
  private nDocs = 0;

  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  fit(documents: string[]): void {
    this.docFreqs = [];
    this.docLen = [];
    const df = new Map<string, number>();

    for (const doc of documents) {
      const toks = tokenize(doc);
      const freqs = new Map<string, number>();
      for (const t of toks) freqs.set(t, (freqs.get(t) ?? 0) + 1);
      this.docFreqs.push(freqs);
      this.docLen.push(toks.length);
      for (const term of freqs.keys()) df.set(term, (df.get(term) ?? 0) + 1);
    }

    this.nDocs = documents.length;
    const totalLen = this.docLen.reduce((a, c) => a + c, 0);
    this.avgdl = this.nDocs ? totalLen / this.nDocs : 0;

    // BM25+ style idf, floored at a small positive value by construction.
    this.idf = new Map();
    for (const [term, freq] of df) {
      this.idf.set(term, Math.log(1 + (this.nDocs - freq + 0.5) / (freq + 0.5)));
    }
  }

  search(query: string, k: number): [number, number][] {
    if (this.nDocs === 0) return [];
    const qTokens = tokenize(query);
    const scores = new Array<number>(this.nDocs).fill(0);

    for (let idx = 0; idx < this.nDocs; idx++) {
      const freqs = this.docFreqs[idx];
      const dl = this.docLen[idx] || 1;
      let score = 0;
      for (const term of qTokens) {
        const tf = freqs.get(term);
        if (!tf) continue;
        const idf = this.idf.get(term) ?? 0;
        const denom =
          tf + this.k1 * (1 - this.b + (this.b * dl) / (this.avgdl || 1));
        score += (idf * (tf * (this.k1 + 1))) / denom;
      }
      scores[idx] = score;
    }

    return topK(scores, k);
  }
}

// Return [index, score] pairs for the top-k scores, best-first, with a stable
// index tiebreak so results are deterministic.
export function topK(scores: number[], k: number): [number, number][] {
  const order = scores.map((s, i) => [i, s] as [number, number]);
  order.sort((x, y) => y[1] - x[1] || x[0] - y[0]);
  return order.slice(0, Math.min(k, order.length));
}
