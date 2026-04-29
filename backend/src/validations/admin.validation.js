import Joi from "joi";
import { config } from "../config/env.js";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_LANGUAGES,
  QUESTION_OPTION_KEYS
} from "../models/question.model.js";

const objectIdSchema = Joi.string().length(24).hex();

const optionSchema = Joi.object({
  key: Joi.string()
    .valid(...QUESTION_OPTION_KEYS)
    .required(),
  text: Joi.string().trim().min(1).max(500).required()
});

const questionBody = Joi.object({
  questionText: Joi.string().trim().min(10).max(2000).required(),
  options: Joi.array()
    .items(optionSchema)
    .length(4)
    .custom((value, helpers) => {
      const keys = value.map((option) => option.key);
      const hasAllKeys = QUESTION_OPTION_KEYS.every((key) => keys.includes(key));
      if (!hasAllKeys) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .required(),
  correctOptionKey: Joi.string()
    .valid(...QUESTION_OPTION_KEYS)
    .required(),
  explanation: Joi.string().allow("").max(2000).default(""),
  topic: Joi.string().trim().required(),
  examTypeId: objectIdSchema.required(),
  subjectId: objectIdSchema.required(),
  subtopic: Joi.string().allow("").max(160).default(""),
  difficulty: Joi.string()
    .valid(...QUESTION_DIFFICULTIES)
    .required(),
  language: Joi.string()
    .valid(...QUESTION_LANGUAGES)
    .default("mr"),
  marks: Joi.number().min(1).max(10).default(1),
  negativeMarks: Joi.number().min(0).max(10).default(0),
  source: Joi.string().allow("").max(160).default("")
});

export const createQuestionSchema = {
  body: questionBody
};

export const updateQuestionSchema = {
  params: Joi.object({
    questionId: objectIdSchema.required()
  }),
  body: Joi.object({
    questionText: Joi.string().trim().min(10).max(2000),
    options: Joi.array().items(optionSchema).length(4),
    correctOptionKey: Joi.string().valid(...QUESTION_OPTION_KEYS),
    explanation: Joi.string().allow("").max(2000),
    topic: Joi.string().trim(),
    examTypeId: objectIdSchema,
    subjectId: objectIdSchema,
    subtopic: Joi.string().allow("").max(160),
    difficulty: Joi.string().valid(...QUESTION_DIFFICULTIES),
    language: Joi.string().valid(...QUESTION_LANGUAGES),
    marks: Joi.number().min(1).max(10),
    negativeMarks: Joi.number().min(0).max(10),
    source: Joi.string().allow("").max(160),
    status: Joi.string().valid("active", "archived")
  }).min(1)
};

export const deleteQuestionSchema = {
  params: Joi.object({
    questionId: objectIdSchema.required()
  })
};

export const listQuestionsSchema = {
  query: Joi.object({
    topic: Joi.string().trim(),
    examTypeId: objectIdSchema,
    subjectId: objectIdSchema,
    difficulty: Joi.string().valid(...QUESTION_DIFFICULTIES),
    status: Joi.string().valid("active", "archived"),
    search: Joi.string().trim().max(160).allow(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

export const listExamsSchema = {
  query: Joi.object({
    status: Joi.string().valid("draft", "scheduled", "live", "completed", "cancelled"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })
};

const examBody = Joi.object({
  title: Joi.string().trim().min(4).max(160).required(),
  description: Joi.string().allow("").max(1000).default(""),
  instructions: Joi.string().allow("").max(3000).default(""),
  scheduledStartAt: Joi.date().iso().required(),
  durationMinutes: Joi.number().integer().min(1).max(300).required(),
  totalQuestions: Joi.number().integer().min(5).max(200).required(),
  topics: Joi.array()
    .items(Joi.string())
    .unique()
    .min(1)
    .required(),
  examTypeId: objectIdSchema.required(),
  maxUsersPerRoom: Joi.number().integer().min(10).max(500).default(100),
  saveAsDraft: Joi.boolean().default(false)
});

export const createExamSchema = {
  body: examBody
};

export const updateExamSchema = {
  params: Joi.object({
    examId: objectIdSchema.required()
  }),
  body: Joi.object({
    title: Joi.string().trim().min(4).max(160),
    description: Joi.string().allow("").max(1000),
    instructions: Joi.string().allow("").max(3000),
    scheduledStartAt: Joi.date().iso(),
    durationMinutes: Joi.number().integer().min(1).max(300),
    totalQuestions: Joi.number().integer().min(5).max(200),
    topics: Joi.array()
      .items(Joi.string().valid(...config.allowedQuestionTopics))
      .unique()
      .min(1),
    maxUsersPerRoom: Joi.number().integer().min(10).max(500),
    saveAsDraft: Joi.boolean()
  }).min(1)
};

export const deleteExamSchema = {
  params: Joi.object({
    examId: objectIdSchema.required()
  })
};

export const publishExamSchema = {
  params: Joi.object({
    examId: objectIdSchema.required()
  })
};
