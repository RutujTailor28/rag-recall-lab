// Deterministic hashing embedder — the "mock" dense retriever.
//
// Each token is hashed into a fixed-dimensional bag-of-hashed-tokens vector and
// the result is L2-normalised, so a cosine score is a single dot product. No
// network, no secrets, fully reproducible across browser and test runs — and
// good enough to demonstrate semantic-style dense retrieval against the corpus.

import { tokenize } from "./tokenize";

export const EMBED_DIM = 256;

// Two cheap, independent 32-bit string hashes (FNV-1a variants with different
// offset bases). Two buckets per token reduce collisions; the sign bit adds a
// little structure so unrelated texts stay closer to orthogonal.
function hashA(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hashB(s: string): number {
  let h = 0x27d4eb2f;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x85ebca6b);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

export function embed(text: string, dim = EMBED_DIM): Float64Array {
  const vec = new Float64Array(dim);
  for (const tok of tokenize(text)) {
    const a = hashA(tok);
    const b = hashB(tok);
    const sign = b & 1 ? 1 : -1;
    vec[a % dim] += 1;
    vec[b % dim] += sign;
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return vec;
}

export function cosine(a: Float64Array, b: Float64Array): number {
  // Both vectors are already L2-normalised, so cosine is just the dot product.
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}
