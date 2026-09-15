/**
 * Extract human-readable WhatsApp template body text from MSG91 raw payloads.
 *
 * @module modules/whatsapp/template-body.util
 */

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const fromComponents = (components: unknown): string | null => {
  if (!Array.isArray(components)) return null;
  for (const component of components) {
    if (!component || typeof component !== "object") continue;
    const type = String((component as { type?: unknown }).type || "").toUpperCase();
    if (type !== "BODY") continue;
    const text =
      asString((component as { text?: unknown }).text) ||
      asString((component as { body?: unknown }).body) ||
      asString((component as { value?: unknown }).value);
    if (text) return text;
  }
  return null;
};

/**
 * Best-effort extraction of template message body from MSG91 get-template payloads.
 */
export const extractTemplateBodyFromRaw = (raw: unknown): string | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const direct =
    asString(row.body) ||
    asString(row.body_text) ||
    asString(row.bodyText) ||
    asString(row.template_body) ||
    asString(row.templateBody) ||
    asString(row.text) ||
    asString(row.message) ||
    asString(row.content);
  if (direct) return direct;

  const fromTopComponents = fromComponents(row.components);
  if (fromTopComponents) return fromTopComponents;

  const languages = row.languages;
  if (Array.isArray(languages)) {
    for (const lang of languages) {
      if (!lang || typeof lang !== "object") continue;
      const langRow = lang as Record<string, unknown>;
      const langDirect =
        asString(langRow.body) ||
        asString(langRow.body_text) ||
        asString(langRow.text) ||
        asString(langRow.message);
      if (langDirect) return langDirect;
      const fromLangComponents = fromComponents(langRow.components);
      if (fromLangComponents) return fromLangComponents;
    }
  }

  return null;
};

/**
 * Fill {{1}} / {{var}} placeholders with sample values for a readable preview.
 */
export const previewTemplateBody = (
  body: string | null | undefined,
  sampleValues: string[]
): string | null => {
  if (!body) return null;
  let i = 0;
  return body.replace(/\{\{\s*[\w.]+\s*\}\}/g, () => {
    const sample = sampleValues[i];
    i += 1;
    return sample !== undefined && sample !== "" ? sample : `{{${i}}}`;
  });
};
