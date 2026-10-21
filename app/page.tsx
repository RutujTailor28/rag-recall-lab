"use client";

import { useRef, useState } from "react";
import ModeBadge from "@/components/ModeBadge";
import RetrievalControls from "@/components/RetrievalControls";
import { runRetrieval, streamAnswer } from "@/lib/mockChat";
import {
  DEFAULT_CONFIG,
  type RetrievalConfig,
  type Source,
} from "@/lib/types";

const SUGGESTIONS = [
  "How does Reciprocal Rank Fusion combine rankings?",
  "What is a cross-encoder reranker?",
  "Why does chunk overlap matter?",
  "How is recall@k different from MRR?",
];

interface Turn {
  question: string;
  config: RetrievalConfig;
  answer: string;
  sources: Source[];
  streaming: boolean;
}

// Render an answer, turning [n] markers into teal citation chips.
function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="leading-relaxed text-slate-100">
      {parts.map((part, i) =>
        /^\[\d+\]$/.test(part) ? (
          <sup
            key={i}
            className="mx-0.5 rounded bg-teal/20 px-1 py-0.5 text-[10px] font-semibold text-teal-soft"
          >
            {part.replace(/[[\]]/g, "")}
          </sup>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

function SourceCard({ source }: { source: Source }) {
  return (
    <div className="card p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded bg-teal/20 text-[11px] font-bold text-teal-soft">
            {source.rank}
          </span>
          <span className="truncate text-sm font-medium text-white">
            {source.title}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-slate-400">
          {source.score.toFixed(3)}
        </span>
      </div>
      <div className="mb-1 font-mono text-[11px] text-amber-soft">
        {source.source}
      </div>
      <p className="line-clamp-4 text-xs text-slate-400">{source.text}</p>
    </div>
  );
}

export default function ChatPage() {
  const [config, setConfig] = useState<RetrievalConfig>(DEFAULT_CONFIG);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setLoading(true);

    const used = config;
    const { answer, sources } = runRetrieval(question, used);
    const idx = turns.length;
    setTurns((t) => [
      ...t,
      { question, config: used, answer: "", sources, streaming: true },
    ]);
    scrollToBottom();

    await streamAnswer(answer, (soFar) => {
      setTurns((t) => {
        const copy = [...t];
        if (copy[idx]) copy[idx] = { ...copy[idx], answer: soFar };
        return copy;
      });
    });

    setTurns((t) => {
      const copy = [...t];
      if (copy[idx]) copy[idx] = { ...copy[idx], streaming: false };
      return copy;
    });
    setLoading(false);
    scrollToBottom();
  }

  return (
    <div className="grid gap-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Chat with your docs
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Ask a question — the answer is grounded in retrieved passages, with
          every claim cited back to its source chunk. Change the retrieval
          config and watch the sources move.
        </p>
      </section>

      <RetrievalControls config={config} onChange={setConfig} />

      <section className="grid gap-4">
        {turns.length === 0 && (
          <div className="card p-5">
            <p className="mb-3 text-sm text-slate-300">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn-ghost" onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i} className="grid gap-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-navy-600 px-4 py-2 text-sm text-white">
                {turn.question}
              </div>
            </div>

            <div className="card p-4">
              <div className="mb-2 flex items-center gap-2">
                <ModeBadge mode={turn.config.mode} />
                <span className="text-[11px] text-slate-500">
                  top-k {turn.config.topK} · chunk {turn.config.chunkSize}
                </span>
              </div>
              <AnswerText text={turn.answer} />
              {!turn.streaming && turn.sources.length > 0 && (
                <>
                  <div className="mb-2 mt-4 text-xs uppercase tracking-wide text-slate-500">
                    Sources
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {turn.sources.map((s) => (
                      <SourceCard key={s.chunk_id} source={s} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
            Retrieving and composing a grounded answer…
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about chunking, hybrid search, reranking, evaluation…"
          className="flex-1 rounded-lg border border-white/10 bg-navy-800 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal/60"
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          Ask
        </button>
      </form>
    </div>
  );
}
