import mongoose from "mongoose";
import { config } from "../src/config/env.js";
import { UserModel } from "../src/models/user.model.js";
import { signAccessToken, verifyAccessToken } from "../src/shared/utils/jwt.js";

const DEFAULT_EMAIL = "admin@examstrike.com";
const args = process.argv.slice(2);

function hasFlag(flag) {
  return args.includes(flag);
}

function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function printUsage() {
  console.log(`Usage:
  npm run jwt
  npm run jwt -- --email admin@examstrike.com
  npm run jwt -- --user-id 69eecba319772d0f34ffdc54
  npm run jwt -- --email admin@examstrike.com --token-only
  npm run jwt -- --user-id 69eecba319772d0f34ffdc54 --json

Flags:
  --email <email>       Find a user by email. Defaults to ${DEFAULT_EMAIL}
  --user-id <id>        Find a user by Mongo ObjectId
  --token-only          Print only the JWT token
  --json                Print structured JSON output
  --help                Show this help message`);
}

async function findUser() {
  const userId = getArgValue("--user-id");
  const email = getArgValue("--email");

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error(`Invalid Mongo ObjectId: ${userId}`);
    }

    return UserModel.findById(userId).select("name email role authProvider pictureUrl").lean();
  }

  const normalizedEmail = (email || DEFAULT_EMAIL).trim().toLowerCase();
  return UserModel.findOne({ email: normalizedEmail })
    .select("name email role authProvider pictureUrl")
    .lean();
}

function buildOutput(user, token) {
  const payload = verifyAccessToken(token);

  return {
    token,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider
    }
  };
}

async function main() {
  if (hasFlag("--help")) {
    printUsage();
    return;
  }

  await mongoose.connect(config.mongoUri);

  const user = await findUser();
  if (!user) {
    throw new Error("User was not found for the provided lookup.");
  }

  const token = signAccessToken(user);
  const output = buildOutput(user, token);

  if (hasFlag("--token-only")) {
    console.log(output.token);
    return;
  }

  if (hasFlag("--json")) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`JWT generated successfully
User: ${output.user.name} <${output.user.email}>
Role: ${output.user.role}
Auth Provider: ${output.user.authProvider}
User ID: ${output.user.id}
Expires At: ${output.expiresAt}

Token:
${output.token}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
  });
