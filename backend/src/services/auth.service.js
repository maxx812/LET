import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model.js";
import { AppError } from "../shared/errors/app-error.js";
import { serializeAuthUser, signAccessToken } from "../shared/utils/jwt.js";
import { verifyFirebaseIdToken } from "./firebase-verifier.js";

export const authService = {
  async adminLogin({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({
      email: normalizedEmail,
      role: "admin",
      authProvider: "local"
    }).select("+passwordHash");

    if (!user || !user.passwordHash) {
      throw new AppError(401, "Invalid admin credentials", {
        code: "ADMIN_LOGIN_FAILED"
      });
    }

    if (!user.isActive) {
      throw new AppError(403, "Admin account is disabled", {
        code: "ACCOUNT_DISABLED"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid admin credentials", {
        code: "ADMIN_LOGIN_FAILED"
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return {
      accessToken: signAccessToken(user),
      user: serializeAuthUser(user)
    };
  },

  async firebaseLogin({ idToken }) {
    const claims = await verifyFirebaseIdToken(idToken);

    if (claims.firebase?.sign_in_provider && claims.firebase.sign_in_provider !== "google.com") {
      throw new AppError(403, "Only Google-based Firebase login is allowed", {
        code: "UNSUPPORTED_SIGN_IN_PROVIDER"
      });
    }

    const email = claims.email.toLowerCase();
    let user = await UserModel.findOne({
      $or: [{ firebaseUid: claims.sub }, { email }]
    });

    if (user?.role === "admin" && user.authProvider === "local") {
      throw new AppError(403, "Admin accounts must use the admin login flow", {
        code: "ADMIN_USE_LOCAL_LOGIN"
      });
    }

    if (!user) {
      user = await UserModel.create({
        name: claims.name || email.split("@")[0],
        email,
        role: "user",
        authProvider: "firebase",
        firebaseUid: claims.sub,
        pictureUrl: claims.picture || null,
        isActive: true,
        lastLoginAt: new Date()
      });
    } else {
      if (!user.isActive) {
        throw new AppError(403, "User account is disabled", {
          code: "ACCOUNT_DISABLED"
        });
      }

      user.name = claims.name || user.name;
      user.pictureUrl = claims.picture || user.pictureUrl;
      user.firebaseUid = claims.sub;
      user.authProvider = "firebase";
      user.lastLoginAt = new Date();
      await user.save();
    }

    return {
      accessToken: signAccessToken(user),
      user: serializeAuthUser(user)
    };
  },

  async verifySession(auth) {
    const user = await UserModel.findById(auth.sub);
    if (!user || !user.isActive) {
      throw new AppError(401, "Session is no longer valid", {
        code: "SESSION_INVALID"
      });
    }

    return {
      user: serializeAuthUser(user),
      token: {
        sub: auth.sub,
        role: auth.role,
        email: auth.email,
        exp: auth.exp
      }
    };
  }
};
