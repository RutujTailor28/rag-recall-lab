"use client";

import {
  CHUNK_SIZE_OPTIONS,
  MODE_LABELS,
  TOP_K_OPTIONS,
  type RetrievalConfig,
  type RetrievalMode,
} from "@/lib/types";

const MODES = Object.keys(MODE_LABELS) as RetrievalMode[];

// Overlap tracks chunk size (~15%), matching the 800/120 default.
function overlapFor(chunkSize: number): number {
  return Math.round(chunkSize * 0.15);
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        active
          ? "bg-teal text-navy"
          : "border border-white/10 text-slate-300 hover:border-teal/50"
      }`}
    >
      {children}
    </button>
  );
}

export default function RetrievalControls({
  config,
  onChange,
}: {
  config: RetrievalConfig;
  onChange: (c: RetrievalConfig) => void;
}) {
  return (
    <section className="card grid gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-xs uppercase tracking-wide text-slate-500">
          Retrieval
        </span>
        {MODES.map((m) => (
          <Pill
            key={m}
            active={config.mode === m}
            onClick={() => onChange({ ...config, mode: m })}
          >
            {MODE_LABELS[m]}
          </Pill>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-xs uppercase tracking-wide text-slate-500">
          Top-k
        </span>
        {TOP_K_OPTIONS.map((k) => (
          <Pill
            key={k}
            active={config.topK === k}
            onClick={() => onChange({ ...config, topK: k })}
          >
            {k}
          </Pill>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-20 text-xs uppercase tracking-wide text-slate-500">
          Chunk size
        </span>
        {CHUNK_SIZE_OPTIONS.map((size) => (
          <Pill
            key={size}
            active={config.chunkSize === size}
            onClick={() =>
              onChange({
                ...config,
                chunkSize: size,
                chunkOverlap: overlapFor(size),
              })
            }
          >
            {size}
          </Pill>
        ))}
        <span className="text-[11px] text-slate-500">
          overlap {config.chunkOverlap}
        </span>
      </div>
    </section>
  );
}
