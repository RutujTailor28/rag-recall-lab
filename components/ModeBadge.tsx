const LABELS: Record<string, string> = {
  dense: "Dense",
  bm25: "BM25",
  hybrid: "Hybrid (RRF)",
  hybrid_rerank: "Hybrid + Rerank",
};

export default function ModeBadge({ mode }: { mode: string }) {
  return (
    <span className="rounded-full border border-teal/40 bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal-soft">
      {LABELS[mode] ?? mode}
    </span>
  );
}
