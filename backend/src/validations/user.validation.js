import Joi from "joi";

const objectIdSchema = Joi.string().length(24).hex();
const optionSchema = Joi.string().valid("A", "B", "C", "D").allow(null, "");

const answerSchema = Joi.object({
  questionCode: Joi.string().trim().min(3).max(80).required(),
  selectedOptionKey: optionSchema.optional(),
  clientRevision: Joi.number().integer().min(0).default(0),
  submittedAt: Joi.date().iso().optional()
});

export const joinExamSchema = {
  params: Joi.object({
    examId: objectIdSchema.required()
  })
};

export const getExamQuestionsSchema = {
  params: Joi.object({
    examId: objectIdSchema.required()
  })
};

export const submitAnswerSchema = {
  params: Joi.object({
    examId: objectIdSchema.required()
  }),
  body: Joi.object({
    answers: Joi.array().items(answerSchema).min(1).max(100),
    questionCode: Joi.string().trim().min(3).max(80),
    selectedOptionKey: optionSchema,
    clientRevision: Joi.number().integer().min(0),
    submittedAt: Joi.date().iso()
  }).or("answers", "questionCode")
};

export const submitExamSchema = {
  params: Joi.object({
    examId: objectIdSchema.required()
  }),
  body: Joi.object({
    trigger: Joi.string().valid("manual", "auto", "socket_manual").default("manual"),
    answers: Joi.array().items(answerSchema).max(200).default([])
  }).default({})
};

export const getExamResultSchema = {
  params: Joi.object({
    examId: objectIdSchema.required()
  })
};

export const getExamLeaderboardSchema = {
  params: Joi.object({
    examId: objectIdSchema.required()
  })
};
