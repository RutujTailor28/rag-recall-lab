// Client-side orchestration that mimics a streaming RAG backend: retrieve the
// grounded sources, compose an extractive answer, then stream it back
// token-by-token so the UI feels like a live LLM.

import { composeAnswer } from "./answer";
import { getIndex, retrieve, toSources } from "./retrieval";
import type { RetrievalConfig, Source } from "./types";

export interface ChatResult {
  answer: string;
  sources: Source[];
}

export function runRetrieval(
  question: string,
  config: RetrievalConfig,
): ChatResult {
  const index = getIndex(config.chunkSize, config.chunkOverlap);
  const ranked = retrieve(index, question, config.mode, config.topK);
  const sources = toSources(index, ranked);
  const answer = composeAnswer(question, sources);
  return { answer, sources };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Stream an answer token-by-token (word + whitespace preserved), calling
// `onToken` with the cumulative text so far. Returns once fully streamed.
export async function streamAnswer(
  answer: string,
  onToken: (soFar: string) => void,
  opts: { signal?: AbortSignal; delayMs?: number } = {},
): Promise<void> {
  const { signal, delayMs = 24 } = opts;
  // Keep the whitespace/punctuation attached to each token for natural flow.
  const tokens = answer.match(/\S+\s*/g) ?? [];
  let soFar = "";
  for (const tok of tokens) {
    if (signal?.aborted) return;
    soFar += tok;
    onToken(soFar);
    await sleep(delayMs);
  }
}
