"use client";

import { useMemo, useState } from "react";
import { evaluate } from "@/lib/metrics";
import { CHUNK_SIZE_OPTIONS, type ConfigMetrics } from "@/lib/types";

const BARS = [
  { key: "recall_at_5" as const, label: "recall@5", color: "#14b8a6" },
  { key: "mrr" as const, label: "MRR", color: "#f59e0b" },
];

function overlapFor(chunkSize: number): number {
  return Math.round(chunkSize * 0.15);
}

function MetricBars({
  results,
}: {
  results: ConfigMetrics[];
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {BARS.map((bar) => {
        const max = Math.max(...results.map((r) => r[bar.key]), 0.0001);
        return (
          <div key={bar.key} className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: bar.color }}
              />
              <span className="text-sm font-medium text-white">
                {bar.label}
              </span>
            </div>
            <div className="grid gap-3">
              {results.map((r) => (
                <div key={r.config} className="grid gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{r.label}</span>
                    <span className="font-mono text-slate-400">
                      {r[bar.key].toFixed(3)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-navy-700">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(r[bar.key] / max) * 100}%`,
                        backgroundColor: bar.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Grouped SVG bar chart — hand-drawn, zero chart dependencies.
function GroupedChart({ results }: { results: ConfigMetrics[] }) {
  const W = 680;
  const H = 240;
  const padL = 36;
  const padB = 46;
  const padT = 12;
  const plotW = W - padL - 12;
  const plotH = H - padB - padT;
  const groupW = plotW / results.length;
  const barW = Math.min(26, groupW / 3.2);
  const gridlines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="card overflow-x-auto p-5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="recall@5 and MRR by retrieval config"
      >
        {gridlines.map((g) => {
          const y = padT + plotH * (1 - g);
          return (
            <g key={g}>
              <line
                x1={padL}
                y1={y}
                x2={W - 12}
                y2={y}
                stroke="#1e2d4d"
                strokeWidth={1}
              />
              <text x={4} y={y + 4} fill="#64748b" fontSize={10}>
                {g.toFixed(1)}
              </text>
            </g>
          );
        })}
        {results.map((r, i) => {
          const gx = padL + groupW * i + groupW / 2;
          return (
            <g key={r.config}>
              {BARS.map((bar, b) => {
                const v = r[bar.key];
                const h = plotH * v;
                const x = gx - barW - 2 + b * (barW + 4);
                const y = padT + plotH - h;
                return (
                  <rect
                    key={bar.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    rx={3}
                    fill={bar.color}
                  >
                    <title>
                      {r.label} · {bar.label} {v.toFixed(3)}
                    </title>
                  </rect>
                );
              })}
              <text
                x={gx}
                y={H - padB + 18}
                fill="#94a3b8"
                fontSize={11}
                textAnchor="middle"
              >
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-slate-400">
        {BARS.map((bar) => (
          <span key={bar.key} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: bar.color }}
            />
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EvalPage() {
  const [chunkSize, setChunkSize] = useState(800);

  const data = useMemo(
    () => evaluate(5, chunkSize, overlapFor(chunkSize)),
    [chunkSize],
  );

  const best = data.results.reduce((a, b) => (b.mrr > a.mrr ? b : a));

  return (
    <div className="grid gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Retrieval evaluation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            recall@5 and MRR for each retrieval config, computed live in your
            browser over a labelled Q&amp;A set against the sample corpus.
          </p>
          <p className="mt-2 text-lg font-medium text-teal-soft">
            Check retrieval first, then touch the prompt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Chunk size
          </span>
          {CHUNK_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              onClick={() => setChunkSize(size)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                chunkSize === size
                  ? "bg-teal text-navy"
                  : "border border-white/10 text-slate-300 hover:border-teal/50"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <div className="card px-4 py-3 text-sm">
          <span className="text-slate-400">Questions</span>{" "}
          <span className="font-semibold text-white">
            {data.num_questions}
          </span>
        </div>
        <div className="card px-4 py-3 text-sm">
          <span className="text-slate-400">k</span>{" "}
          <span className="font-semibold text-white">{data.k}</span>
        </div>
        <div className="card px-4 py-3 text-sm">
          <span className="text-slate-400">Chunk size</span>{" "}
          <span className="font-semibold text-white">{data.chunk_size}</span>
        </div>
        <div className="card border-teal/40 px-4 py-3 text-sm">
          <span className="text-slate-400">Best MRR</span>{" "}
          <span className="font-semibold text-teal-soft">{best.label}</span>
        </div>
      </section>

      <GroupedChart results={data.results} />

      <MetricBars results={data.results} />

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-700/60 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Config</th>
              <th className="px-4 py-3 text-right font-medium">recall@5</th>
              <th className="px-4 py-3 text-right font-medium">MRR</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r) => {
              const isBest = best.config === r.config;
              return (
                <tr
                  key={r.config}
                  className={`border-t border-white/5 ${
                    isBest ? "bg-teal/5" : "hover:bg-white/5"
                  }`}
                >
                  <td className="px-4 py-3 text-white">
                    {r.label}
                    {isBest && (
                      <span className="ml-2 rounded bg-teal/20 px-1.5 py-0.5 text-[10px] font-semibold text-teal-soft">
                        best
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-200">
                    {r.recall_at_5.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-200">
                    {r.mrr.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <p className="text-xs leading-relaxed text-slate-500">
        recall@5 asks whether a relevant passage reached the top 5 at all; MRR
        rewards placing it first. A retrieved chunk counts as relevant when its
        source document matches the gold answer for that question. All numbers
        are computed client-side from the mock retrieval stack — change the
        chunk size and watch them move.
      </p>
    </div>
  );
}
