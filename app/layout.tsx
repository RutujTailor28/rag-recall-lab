import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "rag-recall-lab — chat with your docs",
  description:
    "A retrieval-focused RAG lab: dense, BM25, hybrid (RRF) and reranking, with a live recall@5 / MRR evaluation. By Rutuj Tailor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <NavBar />
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-5 pb-10 pt-4 text-center text-xs text-slate-500">
          rag-recall-lab · built by Rutuj Tailor · Senior Full Stack AI Engineer
        </footer>
      </body>
    </html>
  );
}
