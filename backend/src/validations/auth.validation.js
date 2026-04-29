import Joi from "joi";

export const adminLoginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required()
  })
};

export const firebaseLoginSchema = {
  body: Joi.object({
    idToken: Joi.string().min(100).required()
  })
};
