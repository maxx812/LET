import crypto from "node:crypto";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function buildQuestionContentHash({ questionText, options, topic, difficulty, language }) {
  const normalizedOptions = [...options]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((option) => `${option.key}:${normalizeText(option.text)}`)
    .join("|");

  const fingerprint = [
    normalizeText(questionText),
    normalizedOptions,
    normalizeText(topic),
    normalizeText(difficulty),
    normalizeText(language)
  ].join("::");

  return crypto.createHash("sha256").update(fingerprint).digest("hex");
}

export function buildQuestionCode() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `Q-${stamp}-${random}`;
}
