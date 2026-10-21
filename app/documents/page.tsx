"use client";

import { useMemo, useRef, useState } from "react";
import { chunkText } from "@/lib/chunking";
import { getIndex } from "@/lib/retrieval";
import { DEFAULT_CONFIG, type DocumentInfo } from "@/lib/types";

interface Progress {
  name: string;
  stage: string;
  pct: number;
}

const STAGES = [
  "Reading file…",
  "Chunking on word boundaries…",
  "Embedding chunks…",
  "Indexing into dense + BM25 stores…",
];

// Read text-like files for a real chunk count; fall back to a size estimate for
// binary files (this is a client-only demo — nothing leaves the browser).
async function readText(file: File): Promise<string | null> {
  if (/\.(md|markdown|txt)$/i.test(file.name)) {
    try {
      return await file.text();
    } catch {
      return null;
    }
  }
  return null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function DocumentsPage() {
  // The seeded corpus comes straight from the client-side index.
  const seeded = useMemo(
    () => getIndex(DEFAULT_CONFIG.chunkSize, DEFAULT_CONFIG.chunkOverlap),
    [],
  );
  const [extra, setExtra] = useState<DocumentInfo[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const documents = [...seeded.documents, ...extra];
  const totalChunks =
    documents.reduce((a, d) => a + d.chunks, 0) || 0;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || progress) return;
    for (const file of Array.from(files)) {
      const text = await readText(file);
      // Simulate the ingestion pipeline with staged progress.
      for (let s = 0; s < STAGES.length; s++) {
        const base = (s / STAGES.length) * 100;
        setProgress({ name: file.name, stage: STAGES[s], pct: base });
        await sleep(260);
        setProgress({
          name: file.name,
          stage: STAGES[s],
          pct: base + 100 / STAGES.length,
        });
        await sleep(120);
      }

      const chars = text ? text.length : Math.max(400, file.size);
      const chunks = text
        ? chunkText(text, DEFAULT_CONFIG.chunkSize, DEFAULT_CONFIG.chunkOverlap)
            .length
        : Math.max(1, Math.round(chars / DEFAULT_CONFIG.chunkSize));

      setExtra((prev) => [
        ...prev,
        {
          doc_id: `upload-${prev.length}`,
          source: file.name,
          title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          chunks,
          chars,
        },
      ]);
    }
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="grid gap-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Documents
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Drop PDFs or markdown and watch the simulated pipeline chunk, embed,
          and index them. This is a client-only demo — files never leave your
          browser, and uploads are added to the corpus view for the session.
        </p>
      </section>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-10 text-center transition ${
          dragging ? "border-teal bg-teal/5" : "border-white/15"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.md,.markdown,.txt"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="grid h-12 w-12 place-items-center rounded-full bg-teal/15 text-teal-soft">
          ↑
        </div>
        <div className="text-sm font-medium text-white">
          {progress ? "Indexing…" : "Drop files or click to upload"}
        </div>
        <div className="text-xs text-slate-500">.pdf · .md · .markdown · .txt</div>
      </label>

      {progress && (
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-mono text-amber-soft">{progress.name}</span>
            <span className="text-slate-400">{progress.stage}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-navy-700">
            <div
              className="h-full rounded-full bg-teal transition-all duration-200"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">
            Indexed corpus
          </h2>
          <div className="flex gap-4 text-xs text-slate-400">
            <span>
              <span className="font-semibold text-teal-soft">
                {documents.length}
              </span>{" "}
              documents
            </span>
            <span>
              <span className="font-semibold text-teal-soft">
                {totalChunks}
              </span>{" "}
              chunks
            </span>
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-700/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 text-right font-medium">Chunks</th>
                <th className="px-4 py-3 text-right font-medium">Chars</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.doc_id}
                  className="border-t border-white/5 hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-white">{doc.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-amber-soft">
                    {doc.source}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {doc.chunks}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {doc.chars.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
