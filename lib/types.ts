export type RetrievalMode = "dense" | "bm25" | "hybrid" | "hybrid_rerank";

export interface Chunk {
  chunk_id: string;
  doc_id: string;
  source: string;
  title: string;
  text: string;
}

export interface Source {
  chunk_id: string;
  doc_id: string;
  source: string;
  title: string;
  text: string;
  score: number;
  rank: number;
}

export interface DocumentInfo {
  doc_id: string;
  source: string;
  title: string;
  chunks: number;
  chars: number;
}

export interface ConfigMetrics {
  config: RetrievalMode;
  label: string;
  recall_at_5: number;
  mrr: number;
}

// Knobs the UI can turn; each materially changes what retrieval returns.
export interface RetrievalConfig {
  mode: RetrievalMode;
  topK: number;
  chunkSize: number;
  chunkOverlap: number;
}

export const MODE_LABELS: Record<RetrievalMode, string> = {
  dense: "Dense",
  bm25: "BM25",
  hybrid: "Hybrid (RRF)",
  hybrid_rerank: "Hybrid + Rerank",
};

export const DEFAULT_CONFIG: RetrievalConfig = {
  mode: "hybrid",
  topK: 5,
  chunkSize: 800,
  chunkOverlap: 120,
};

export const CHUNK_SIZE_OPTIONS = [400, 800, 1200];
export const TOP_K_OPTIONS = [3, 5, 8];
export const CANDIDATE_K = 20;
export const RRF_K = 60;
