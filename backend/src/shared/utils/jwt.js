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
    uid: user.uid,
    name: user.name,
    email: user.email,
    role: user.role,
    authProvider: user.authProvider,
    pictureUrl: user.pictureUrl || null,
    phone: user.phone,
    district: user.district,
    education: user.education,
    gender: user.gender,
    category: user.category,
    targetExamTypeId: user.targetExamTypeId,
    targetExamType: user.targetExamType || null,
    streak: user.streak || 0,
    xp: user.xp || 0,
    accuracy: user.accuracy || 0,
    wins: user.wins || 0
  };
}
