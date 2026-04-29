import jwt from "jsonwebtoken";
import { config } from "../../config/env.js";

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiry
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function serializeAuthUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    authProvider: user.authProvider,
    pictureUrl: user.pictureUrl || null
  };
}
