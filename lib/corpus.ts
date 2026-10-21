// The sample corpus, embedded directly as a client-side TypeScript module.
// This is a frontend-only demo — there is no server and no upload target, so
// the "indexed" documents live here and everything downstream (chunking,
// retrieval, evaluation) runs in the browser.

export interface RawDoc {
  source: string;
  title: string;
  text: string;
}

export const CORPUS: RawDoc[] = [
  {
    source: "01-rag-overview.md",
    title: "Retrieval-Augmented Generation Overview",
    text: `Retrieval-augmented generation, or RAG, pairs a large language model with an external knowledge base so answers are grounded in your own documents instead of only the model's parametric memory. A RAG pipeline has two halves: an offline indexing stage and an online query stage.

During indexing, source documents are parsed, split into chunks, embedded into vectors, and stored alongside the original text. During querying, the user's question is embedded, the most similar chunks are retrieved, and those chunks are injected into the prompt as context for the model to read before it writes an answer.

The central promise of RAG is grounding: because the model answers from retrieved passages, it can cite its sources and is far less likely to hallucinate facts. RAG also keeps knowledge fresh without retraining — you update the index, not the model weights. The quality ceiling of a RAG system is set by retrieval: if the relevant passage is never retrieved, no amount of prompt engineering will recover the answer. That is why this lab measures retrieval first.`,
  },
  {
    source: "02-chunking-strategies.md",
    title: "Chunking Strategies",
    text: `Chunking is the process of splitting a long document into smaller passages that fit a model's context window and align with a single idea. The two knobs that matter most are chunk size and chunk overlap.

Chunk size controls how many characters or tokens each passage holds. Small chunks are precise but can sever a fact from the sentence that explains it. Large chunks preserve context but dilute the embedding, mixing several topics into one vector and hurting retrieval precision.

Overlap repeats a tail of one chunk at the head of the next. Overlap protects against boundary effects: when a key sentence sits exactly on a split point, the repeated tail ensures at least one chunk contains the whole thought. A common starting point is a chunk size of 800 characters with 120 characters of overlap, then tune using the evaluation harness.

Recursive and semantic chunkers try to split on natural boundaries such as headings, paragraphs, and sentences before falling back to a hard character limit. The goal is always the same: one chunk, one coherent idea.`,
  },
  {
    source: "03-embeddings-and-vector-stores.md",
    title: "Embeddings and Vector Stores",
    text: `An embedding model maps text to a dense vector so that passages with similar meaning land close together in vector space. Retrieval then becomes a nearest neighbour search: embed the query, find the chunk vectors with the highest cosine similarity.

Cosine similarity measures the angle between two vectors and ignores their magnitude, which is why embeddings are usually L2-normalised before storage — once normalised, a cosine score is just a dot product. This lab stores normalised vectors in a numpy-style matrix and scores a query with a single matrix-vector multiply, which is fast enough for demo-sized corpora and avoids a heavy native dependency.

Production systems reach for a dedicated vector database such as FAISS, pgvector, or a managed service when the corpus grows into the millions of vectors and approximate nearest neighbour indexes like HNSW become necessary. The trade-off is exactness for speed: approximate indexes return almost the right neighbours far faster than a brute-force scan.`,
  },
  {
    source: "04-bm25-lexical-search.md",
    title: "BM25 and Lexical Search",
    text: `BM25 is a ranking function from classical information retrieval that scores a document by how often the query's terms appear in it, tempered by how common those terms are across the whole corpus. It is a lexical method: it matches exact tokens, not meaning.

Three ideas drive BM25. Term frequency rewards documents that mention a query term more often, but with diminishing returns so a single spammed word cannot dominate. Inverse document frequency downweights common words like "the" and upweights rare, discriminating terms. Length normalisation prevents long documents from winning simply because they contain more words.

Lexical search shines on exact matches: product codes, error messages, proper nouns, and rare jargon that an embedding model may never have seen. Its weakness is vocabulary mismatch — if the user asks about a "car" and the document says "automobile", BM25 scores zero while a dense embedding still finds the link. This complementary strength is exactly why hybrid search exists.`,
  },
  {
    source: "05-hybrid-search-rrf.md",
    title: "Hybrid Search and Reciprocal Rank Fusion",
    text: `Hybrid search runs a dense semantic retriever and a lexical BM25 retriever side by side and merges their results. It captures the best of both: semantic recall for paraphrases and synonyms, lexical precision for exact terms and rare tokens.

The hard part is combining two rankings whose scores are not comparable — a cosine similarity of 0.42 and a BM25 score of 11.3 live on different scales. Reciprocal Rank Fusion sidesteps calibration entirely by using only rank position. Each result contributes a score of one divided by a constant k plus its rank, and the contributions from both lists are summed. A passage that ranks highly in either retriever floats to the top, and one that ranks well in both wins decisively.

The constant k, often set to sixty, dampens the influence of very high ranks so the fusion is not dominated by a single list's first place. Because RRF needs no score normalisation and no training, it is a robust default for blending any number of rankers.`,
  },
  {
    source: "06-reranking.md",
    title: "Reranking",
    text: `A first-stage retriever is tuned for recall: cast a wide net and fetch maybe twenty candidate passages quickly. A reranker is the precision stage that reorders those candidates so the truly relevant ones rise to the top few that actually fit in the prompt.

The dominant reranker design is a cross-encoder. Unlike a bi-encoder, which embeds the query and each document separately and compares vectors, a cross-encoder feeds the query and a candidate together through the model so every query token can attend to every document token. This joint attention is far more accurate at judging relevance, but far more expensive, which is why it is applied only to a short candidate list rather than the whole corpus.

Reranking typically delivers the largest single jump in answer quality for the least engineering effort, because it fixes the common failure where the right passage was retrieved but buried at rank eight. Retrieve broad, rerank narrow, and feed the model only the top handful.`,
  },
  {
    source: "07-evaluation-metrics.md",
    title: "Evaluating Retrieval: Recall and MRR",
    text: `You cannot improve what you do not measure, and in RAG the thing to measure first is retrieval. Two metrics cover most of what you need, and both require a small labelled set of questions paired with the document that answers them.

Recall@k asks a yes-or-no question for each query: did a relevant passage appear anywhere in the top k results? Averaged over the question set, recall@5 tells you how often the right context even reached the model. If recall is low, the answer was doomed before generation began, and prompt tuning cannot save it.

Mean Reciprocal Rank, or MRR, is stricter about position. For each query it takes one divided by the rank of the first relevant passage — rank one scores 1.0, rank two scores 0.5, rank five scores 0.2 — then averages across queries. MRR rewards putting the best passage first, which matters because models attend most to the earliest context. Track recall@k to confirm the passage is present and MRR to confirm it is near the top.`,
  },
  {
    source: "08-prompting-and-citations.md",
    title: "Prompting and Citations",
    text: `Once retrieval is solid, the prompt decides how faithfully the model uses the context it was given. A grounded prompt instructs the model to answer only from the supplied passages, to admit when the passages do not contain the answer, and to cite the passages it relied on.

Inline citations are the simplest honesty mechanism. Number each retrieved passage and ask the model to append the matching bracketed number, such as [1] or [3], after any claim drawn from it. A reader can then trace every statement back to its source chunk, and a reviewer can spot an unsupported sentence because it carries no citation.

A good grounding prompt also fixes the refusal behaviour: when the context is empty or irrelevant, the model should say it cannot find the answer rather than inventing one. This is the last line of defence, not the first — if the context is wrong, a careful prompt only produces a well-cited wrong answer. Fix retrieval first, then tighten the prompt.`,
  },
  {
    source: "09-query-transformation.md",
    title: "Query Transformation",
    text: `The query a user types is often not the best query to search with. Query transformation rewrites or expands the question before retrieval so it matches the way answers are actually phrased in the corpus.

Query expansion adds synonyms and related terms so a lexical retriever stops missing documents that use different vocabulary — searching for "car" also searches for "automobile" and "vehicle". Hypothetical document embeddings, or HyDE, take the opposite route: the model first drafts a fake answer to the question, then embeds that draft and retrieves against it, because an answer looks more like the target passage than the question does.

Multi-query retrieval generates several paraphrases of the question, retrieves for each, and fuses the results. Each of these techniques trades extra model calls and latency for recall, and each is worth measuring against a plain query baseline before you adopt it. Expansion helps most when the corpus vocabulary drifts far from how users ask.`,
  },
  {
    source: "10-metadata-filtering.md",
    title: "Metadata Filtering",
    text: `Not every retrieval problem is purely about semantic similarity. Often the user implicitly restricts the search to a slice of the corpus: documents from a certain author, a date range, a product version, or an access level. Metadata filtering applies those structured constraints alongside the vector search.

Each chunk is stored with metadata fields such as source, title, created date, and tags. A filtered query first narrows the candidate set to chunks whose metadata satisfies the constraint, then ranks the survivors by similarity. Pre-filtering keeps results relevant and also enforces security: a user should never retrieve a passage from a document they are not permitted to read.

The subtle risk is over-filtering. A constraint that is too tight can shrink the candidate pool below k and starve the generator of context, so filters should be validated against the evaluation set just like any other retrieval change. Treat access rules as hard filters and topical hints as soft boosts.`,
  },
  {
    source: "11-context-window-management.md",
    title: "Context Window Management",
    text: `A model's context window is finite, so you cannot simply stuff every retrieved passage into the prompt. Context window management decides which chunks earn a place and in what order, trading breadth of evidence against the cost and the distraction of extra tokens.

The lost-in-the-middle effect is the key constraint: models attend most reliably to text at the very start and the very end of a long context, and passages buried in the middle are often ignored. A practical response is to place the highest-ranked passage first, the second-highest last, and the weaker ones in between, so the strongest evidence sits where attention is highest.

Context compression goes further by summarising or trimming each passage down to the sentences that actually answer the question, letting more distinct documents fit in the same budget. The guiding rule is relevance density: every token in the window should earn its place, because padding the context with marginal passages measurably lowers answer quality.`,
  },
  {
    source: "12-grounding-and-hallucination.md",
    title: "Grounding and Hallucination",
    text: `A hallucination is a confident statement the model was never given evidence for. In a RAG system the defence against hallucination is grounding: every claim in the answer should trace back to a retrieved passage, and claims that cannot be traced should not be made.

Faithfulness measures whether the answer is actually supported by the retrieved context, independent of whether the context itself was correct. An answer can be faithful yet wrong if retrieval surfaced the wrong passage, which is why faithfulness and retrieval recall are tracked as separate metrics. A faithfulness check can be automated by asking a second model to verify each sentence against the cited passage.

The most common cause of hallucination in practice is not a weak generator but a retrieval miss: when no relevant passage was fetched, a helpful model fills the gap by guessing. Fixing retrieval removes the temptation; instructing the model to refuse when the context is empty removes the rest.`,
  },
];
