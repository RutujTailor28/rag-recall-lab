// The retrieval engine, running entirely client-side.
//
// Build an index from the corpus (chunk → embed → BM25 fit), then retrieve
// across four modes: dense cosine, BM25, hybrid via RRF, and hybrid + rerank.
// Indexes are memoised by chunk size, so toggling chunk size in the UI rebuilds
// and genuinely changes results — nothing here is hard-coded.

import { BM25, topK } from "./bm25";
import { chunkText } from "./chunking";
import { CORPUS } from "./corpus";
import { cosine, embed } from "./embeddings";
import { rerank, rrfFuse } from "./search";
import {
  CANDIDATE_K,
  RRF_K,
  type Chunk,
  type DocumentInfo,
  type RetrievalMode,
  type Source,
} from "./types";

function docId(source: string): string {
  // Small stable hash of the source name; mirrors the backend's short id.
  let h = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 12);
}

export interface Index {
  chunks: Chunk[];
  vectors: Float64Array[];
  bm25: BM25;
  documents: DocumentInfo[];
  chunkSize: number;
  chunkOverlap: number;
}

export function buildIndex(chunkSize: number, chunkOverlap: number): Index {
  const chunks: Chunk[] = [];
  const documents: DocumentInfo[] = [];

  for (const doc of CORPUS) {
    const id = docId(doc.source);
    const pieces = chunkText(doc.text, chunkSize, chunkOverlap);
    pieces.forEach((text, i) => {
      chunks.push({
        chunk_id: `${id}-${i}`,
        doc_id: id,
        source: doc.source,
        title: doc.title,
        text,
      });
    });
    documents.push({
      doc_id: id,
      source: doc.source,
      title: doc.title,
      chunks: pieces.length,
      chars: doc.text.length,
    });
  }

  const vectors = chunks.map((c) => embed(c.text));
  const bm25 = new BM25();
  bm25.fit(chunks.map((c) => c.text));

  return { chunks, vectors, bm25, documents, chunkSize, chunkOverlap };
}

const indexCache = new Map<string, Index>();

export function getIndex(chunkSize: number, chunkOverlap: number): Index {
  const key = `${chunkSize}:${chunkOverlap}`;
  let idx = indexCache.get(key);
  if (!idx) {
    idx = buildIndex(chunkSize, chunkOverlap);
    indexCache.set(key, idx);
  }
  return idx;
}

function denseSearch(index: Index, query: string, k: number): [number, number][] {
  const qvec = embed(query);
  const scores = index.vectors.map((v) => cosine(v, qvec));
  return topK(scores, k);
}

export function retrieve(
  index: Index,
  query: string,
  mode: RetrievalMode,
  topKn: number,
): [number, number][] {
  if (index.chunks.length === 0) return [];
  const candidateK = Math.max(CANDIDATE_K, topKn);

  if (mode === "dense") return denseSearch(index, query, topKn);
  if (mode === "bm25") return index.bm25.search(query, topKn);

  // hybrid / hybrid_rerank both start from a fused candidate pool.
  const dense = denseSearch(index, query, candidateK);
  const lexical = index.bm25.search(query, candidateK);
  const fused = rrfFuse(
    [dense.map(([i]) => i), lexical.map(([i]) => i)],
    RRF_K,
    candidateK,
  );

  if (mode === "hybrid") return fused.slice(0, topKn);

  // hybrid_rerank: precision pass over the fused candidates.
  const candidates = fused.map(
    ([idx]) => [idx, index.chunks[idx].text] as [number, string],
  );
  return rerank(query, candidates, topKn);
}

export function toSources(
  index: Index,
  ranked: [number, number][],
): Source[] {
  return ranked.map(([idx, score], i) => {
    const c = index.chunks[idx];
    return {
      chunk_id: c.chunk_id,
      doc_id: c.doc_id,
      source: c.source,
      title: c.title,
      text: c.text,
      score: Math.round(score * 1e6) / 1e6,
      rank: i + 1,
    };
  });
}
