import type { AIToolAuthContext } from "../security/ai-scope.service";
import { embedQuery, EmbeddingError } from "../../../integrations/embeddings/embeddings.client";
import {
  searchCallSummaryEmbeddings,
} from "../call-summary-embedding.service";

export const executeSearchCallSummaries = async (
  context: AIToolAuthContext,
  args: { query?: string; limit?: number }
) => {
  const query = (args.query || "").trim();
  if (!query) {
    return {
      error: "query is required",
      results: [],
      summaryText: "A search query is required to find matching call summaries.",
    };
  }

  const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 10);

  try {
    const { embedding } = await embedQuery(context.instituteId, query);
    const results = await searchCallSummaryEmbeddings({
      instituteId: context.instituteId,
      branchId: context.branchId ?? null,
      queryEmbedding: embedding,
      limit,
    });

    const scopeLabel = context.branchId ? "in your branch" : "across the institute";
    if (results.length === 0) {
      return {
        query,
        results: [],
        summaryText: `No matching AI call summaries found ${scopeLabel} for that query.`,
      };
    }

    const lines = results.map(
      (r, i) =>
        `${i + 1}. ${r.leadName || "Unknown lead"} (${r.phoneLast4}) — ${r.summary.slice(0, 200)}${
          r.summary.length > 200 ? "…" : ""
        } [${Math.round(r.similarity * 100)}% match]`
    );

    return {
      query,
      results,
      summaryText: `Found ${results.length} call summary match(es) ${scopeLabel}:\n${lines.join("\n")}`,
    };
  } catch (err: unknown) {
    const message =
      err instanceof EmbeddingError
        ? err.message
        : (err as Error)?.message || "Call summary search temporarily unavailable";
    return {
      query,
      results: [],
      error: message,
      summaryText:
        "Call summary semantic search is temporarily unavailable. Try again later or use lead list tools for structured filters.",
    };
  }
};
