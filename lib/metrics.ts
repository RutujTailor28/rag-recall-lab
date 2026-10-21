// Retrieval evaluation: recall@k and MRR across the four retrieval configs.
//
// A retrieved chunk counts as relevant when its source document matches the
// gold source for the question. recall@k asks whether a relevant chunk appears
// in the top k at all; MRR = 1 / rank of the first relevant chunk, averaged.
// Because switching retrieval config moves these numbers far more than prompt
// tweaks do, this is the number to watch first.

import { getIndex, retrieve } from "./retrieval";
import {
  MODE_LABELS,
  type ConfigMetrics,
  type RetrievalMode,
} from "./types";

export interface QAItem {
  question: string;
  source: string;
}

export const QA: QAItem[] = [
  { question: "What are the two stages of a RAG pipeline?", source: "01-rag-overview.md" },
  { question: "Why does grounding answers in retrieved passages reduce made-up facts?", source: "01-rag-overview.md" },
  { question: "How does retrieval set the quality ceiling of a RAG system?", source: "01-rag-overview.md" },
  { question: "What do chunk size and chunk overlap control?", source: "02-chunking-strategies.md" },
  { question: "Why does repeating a tail between passages help at split boundaries?", source: "02-chunking-strategies.md" },
  { question: "What is a sensible default for chunk size and overlap before tuning?", source: "02-chunking-strategies.md" },
  { question: "What does cosine similarity measure and why normalise vectors?", source: "03-embeddings-and-vector-stores.md" },
  { question: "When do approximate nearest neighbour indexes like HNSW become necessary?", source: "03-embeddings-and-vector-stores.md" },
  { question: "How do term frequency and inverse document frequency shape BM25 scores?", source: "04-bm25-lexical-search.md" },
  { question: "When does matching exact tokens beat semantic embeddings?", source: "04-bm25-lexical-search.md" },
  { question: "How does Reciprocal Rank Fusion combine rankings without calibrating scores?", source: "05-hybrid-search-rrf.md" },
  { question: "Why run a dense retriever and BM25 together instead of one alone?", source: "05-hybrid-search-rrf.md" },
  { question: "What is a cross-encoder and why is it more accurate than a bi-encoder?", source: "06-reranking.md" },
  { question: "Why does a precision reranking stage give a big quality jump for little effort?", source: "06-reranking.md" },
  { question: "How is recall@k different from mean reciprocal rank?", source: "07-evaluation-metrics.md" },
  { question: "What reciprocal rank score does a first relevant result at position two get?", source: "07-evaluation-metrics.md" },
  { question: "How do inline bracketed citations improve answer honesty?", source: "08-prompting-and-citations.md" },
  { question: "What should the model do when the retrieved context is irrelevant or empty?", source: "08-prompting-and-citations.md" },
  { question: "What is HyDE and how does drafting a fake answer help retrieval?", source: "09-query-transformation.md" },
  { question: "How does expanding a query with synonyms like automobile and vehicle help?", source: "09-query-transformation.md" },
  { question: "How does filtering on structured fields like author or date work before ranking?", source: "10-metadata-filtering.md" },
  { question: "What is the danger of over-filtering the candidate pool?", source: "10-metadata-filtering.md" },
  { question: "What is the lost-in-the-middle effect and how should passages be ordered?", source: "11-context-window-management.md" },
  { question: "How does context compression fit more documents into a fixed token budget?", source: "11-context-window-management.md" },
  { question: "What does faithfulness measure and how can an answer be faithful yet wrong?", source: "12-grounding-and-hallucination.md" },
  { question: "What is the most common cause of hallucination in practice?", source: "12-grounding-and-hallucination.md" },
];

const CONFIGS: RetrievalMode[] = ["dense", "bm25", "hybrid", "hybrid_rerank"];

export interface EvalResult {
  results: ConfigMetrics[];
  num_questions: number;
  k: number;
  chunk_size: number;
}

export function evaluate(k = 5, chunkSize = 800, chunkOverlap = 120): EvalResult {
  const index = getIndex(chunkSize, chunkOverlap);
  const n = QA.length || 1;
  const results: ConfigMetrics[] = [];

  for (const config of CONFIGS) {
    let hits = 0;
    let reciprocalSum = 0;
    for (const item of QA) {
      const ranked = retrieve(index, item.question, config, k);
      let firstRelRank: number | null = null;
      for (let rank = 0; rank < ranked.length; rank++) {
        if (index.chunks[ranked[rank][0]].source === item.source) {
          firstRelRank = rank + 1;
          break;
        }
      }
      if (firstRelRank !== null) {
        hits++;
        reciprocalSum += 1 / firstRelRank;
      }
    }
    results.push({
      config,
      label: MODE_LABELS[config],
      recall_at_5: Math.round((hits / n) * 1e4) / 1e4,
      mrr: Math.round((reciprocalSum / n) * 1e4) / 1e4,
    });
  }

  return { results, num_questions: QA.length, k, chunk_size: chunkSize };
}
