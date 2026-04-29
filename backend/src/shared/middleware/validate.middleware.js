import { AppError } from "../errors/app-error.js";

export function validateRequest(schemas = {}) {
  return (req, _res, next) => {
    try {
      for (const [target, schema] of Object.entries(schemas)) {
        if (!schema) continue;

        const { value, error } = schema.validate(req[target], {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          throw new AppError(422, "Request validation failed", {
            code: "VALIDATION_ERROR",
            details: error.details.map((detail) => ({
              message: detail.message,
              path: detail.path.join(".")
            }))
          });
        }

        req[target] = value;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
