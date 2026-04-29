import mongoose from "mongoose";
import { config } from "../src/config/env.js";

async function check() {
  await mongoose.connect(config.mongoUri);
  const userModel = mongoose.connection.collection("users");
  const users = await userModel.find({}).toArray();
  console.log("All Users in DB:", JSON.stringify(users.map(u => ({
    email: u.email,
    role: u.role,
    authProvider: u.authProvider,
    hasPassword: !!u.passwordHash,
    isActive: u.isActive
  })), null, 2));
  process.exit(0);
}

check().catch(console.error);
