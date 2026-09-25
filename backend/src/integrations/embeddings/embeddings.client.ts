import axios from "axios";
import { createHash } from "crypto";
import { logger } from "../../config/logger";
import { resolveAiCredentials } from "../../modules/integrations/integration.service";

export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
export const GEMINI_EMBEDDING_DIMS = 768;

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export class EmbeddingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingError";
  }
}

/** Deterministic mock vector for tests / USE_MOCK_EMBEDDINGS=1 (no live API). */
export function mockEmbedText(text: string, dims = GEMINI_EMBEDDING_DIMS): number[] {
  const vec = new Array(dims).fill(0);
  const normalized = text.toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    vec[code % dims] += 1;
    vec[(code * 31 + i) % dims] += 0.5;
  }
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

export function hashEmbedContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Format a float array as a pgvector literal (optional / future HNSW path). */
export function toPgVectorLiteral(embedding: number[]): string {
  if (embedding.length !== GEMINI_EMBEDDING_DIMS) {
    throw new EmbeddingError(
      `Expected embedding dim ${GEMINI_EMBEDDING_DIMS}, got ${embedding.length}`
    );
  }
  return `[${embedding.map((n) => Number(n).toFixed(8)).join(",")}]`;
}

async function callGeminiEmbed(
  apiKey: string,
  text: string,
  taskType: EmbedTaskType
): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent`;
  const response = await axios.post(
    url,
    {
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      timeout: 30000,
      params: { key: apiKey },
    }
  );

  const values = response.data?.embedding?.values as number[] | undefined;
  if (!values || !Array.isArray(values) || values.length === 0) {
    throw new EmbeddingError("Gemini embedContent returned empty embedding");
  }
  if (values.length !== GEMINI_EMBEDDING_DIMS) {
    throw new EmbeddingError(
      `Unexpected embedding dimensions: ${values.length} (expected ${GEMINI_EMBEDDING_DIMS})`
    );
  }
  return values;
}

/**
 * Embed texts with Gemini (or mock). Prefer institute AI credentials.
 */
export async function embedTexts(
  instituteId: string,
  texts: string[],
  taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT"
): Promise<{ embeddings: number[][]; model: string }> {
  if (texts.length === 0) {
    return { embeddings: [], model: GEMINI_EMBEDDING_MODEL };
  }

  if (process.env.USE_MOCK_EMBEDDINGS === "1" || process.env.NODE_TEST_CONTEXT) {
    return {
      embeddings: texts.map((t) => mockEmbedText(t)),
      model: "mock-embedding",
    };
  }

  const creds = await resolveAiCredentials(instituteId);
  const apiKey = creds.apiKey;
  if (!apiKey) {
    throw new EmbeddingError("Gemini API key is not configured for embeddings");
  }

  try {
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await callGeminiEmbed(apiKey, text.slice(0, 8000), taskType));
    }
    return { embeddings, model: GEMINI_EMBEDDING_MODEL };
  } catch (err: unknown) {
    const message =
      err instanceof EmbeddingError
        ? err.message
        : (err as { response?: { data?: unknown }; message?: string })?.message ||
          "Embedding request failed";
    logger.warn({ err, instituteId }, "[embeddings] Gemini embed failed");
    throw new EmbeddingError(String(message));
  }
}

export async function embedQuery(
  instituteId: string,
  query: string
): Promise<{ embedding: number[]; model: string }> {
  const { embeddings, model } = await embedTexts(instituteId, [query], "RETRIEVAL_QUERY");
  return { embedding: embeddings[0], model };
}

export async function embedDocument(
  instituteId: string,
  text: string
): Promise<{ embedding: number[]; model: string }> {
  const { embeddings, model } = await embedTexts(instituteId, [text], "RETRIEVAL_DOCUMENT");
  return { embedding: embeddings[0], model };
}
