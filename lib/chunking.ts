// Configurable text chunking with overlap — a TypeScript port of the lab's
// reference chunker. Chunks are built on word boundaries targeting `chunkSize`
// characters, with `chunkOverlap` characters repeated between neighbours so a
// fact that straddles a boundary stays retrievable.

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function chunkText(
  text: string,
  chunkSize = 800,
  chunkOverlap = 120,
): string[] {
  text = normalize(text);
  if (!text) return [];

  chunkSize = Math.max(1, chunkSize);
  chunkOverlap = Math.max(0, Math.min(chunkOverlap, chunkSize - 1));

  const words = text.split(" ");
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const word of words) {
    // +1 accounts for the joining space.
    const added = word.length + (current.length ? 1 : 0);
    if (currentLen + added > chunkSize && current.length) {
      chunks.push(current.join(" "));
      // Build the overlap tail from the end of the current chunk.
      const overlapWords: string[] = [];
      let overlapLen = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const w = current[i];
        const extra = w.length + (overlapWords.length ? 1 : 0);
        if (overlapLen + extra > chunkOverlap) break;
        overlapWords.unshift(w);
        overlapLen += extra;
      }
      current = overlapWords;
      currentLen = overlapLen;
    }
    current.push(word);
    currentLen += added;
  }

  if (current.length) chunks.push(current.join(" "));
  return chunks;
}
