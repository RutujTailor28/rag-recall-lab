// Shared lowercase alphanumeric tokenizer, used by embeddings, BM25,
// reranking, and the extractive answerer so every stage sees the same tokens.

const TOKEN_RE = /[a-z0-9]+/g;

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(TOKEN_RE) ?? [];
}
