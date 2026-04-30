import { buildQuestionCode, buildQuestionContentHash } from "./question-hash.js";

export function normalizeQuestionPayload(input) {
  const options = (input.options || [])
    .map((option) => ({
      key: String(option.key || "")
        .trim()
        .toUpperCase(),
      text: String(option.text || "").trim()
    }))
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    questionText: String(input.questionText || "").trim(),
    options,
    correctOptionKey: String(input.correctOptionKey || "")
      .trim()
      .toUpperCase(),
    explanation: String(input.explanation || "").trim(),
    topic: String(input.topic || "").trim(),
    examTypeId: input.examTypeId,
    subjectId: input.subjectId,
    subtopic: String(input.subtopic || "").trim(),
    difficulty: String(input.difficulty || "")
      .trim()
      .toLowerCase(),
    language: String(input.language || "mr")
      .trim()
      .toLowerCase(),
    marks: Number(input.marks ?? 1),
    negativeMarks: Number(input.negativeMarks ?? 0),
    source: String(input.source || "").trim(),
    status: String(input.status || "active")
  };
}

export function buildQuestionDocument(input, actorId) {
  const payload = normalizeQuestionPayload(input);

  return {
    ...payload,
    questionCode: buildQuestionCode(),
    contentHash: buildQuestionContentHash(payload),
    createdBy: actorId,
    updatedBy: actorId
  };
}

export function toQuestionResponse(question) {
  return {
    id: question._id?.toString?.() || question.id,
    questionCode: question.questionCode,
    questionText: question.questionText,
    options: question.options,
    correctOptionKey: question.correctOptionKey,
    explanation: question.explanation,
    topic: question.topic,
    examTypeId: question.examTypeId,
    subjectId: question.subjectId,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    language: question.language,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
    source: question.source,
    status: question.status,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt
  };
}
