import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../src/config/env.js";

async function seed() {
  await mongoose.connect(config.mongoUri);
  const userModel = mongoose.connection.collection("users");
  
  const existing = await userModel.findOne({ email: "admin@examstrike.com" });
  if (existing) {
    console.log("Admin already exists!");
    process.exit(0);
  }

  const hash = await bcrypt.hash("admin123", 10);
  await userModel.insertOne({
    name: "Super Admin",
    email: "admin@examstrike.com",
    passwordHash: hash,
    role: "admin",
    authProvider: "local",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log("Admin seeded successfully: admin@examstrike.com / admin123");
  process.exit(0);
}

seed().catch(console.error);
