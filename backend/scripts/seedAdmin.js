import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../src/config/env.js";

const adminEmail = process.env.ADMIN_EMAIL || "admin@examstrike.com";
const adminName = process.env.ADMIN_NAME || "Super Admin";
const adminPassword = process.env.ADMIN_PASSWORD;

async function seed() {
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is required to seed an admin user.");
  }

  await mongoose.connect(config.mongoUri);
  const userModel = mongoose.connection.collection("users");

  const existing = await userModel.findOne({ email: adminEmail });
  if (existing) {
    console.log("Admin already exists.");
    process.exit(0);
  }

  const hash = await bcrypt.hash(adminPassword, 10);
  await userModel.insertOne({
    name: adminName,
    email: adminEmail,
    passwordHash: hash,
    role: "admin",
    authProvider: "local",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log(`Admin seeded successfully: ${adminEmail}`);
  process.exit(0);
}

seed().catch(console.error);
