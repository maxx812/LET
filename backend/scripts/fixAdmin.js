import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../src/config/env.js";

async function fix() {
  try {
    console.log("Connecting to MongoDB:", config.mongoUri);
    await mongoose.connect(config.mongoUri);
    console.log("Connected to MongoDB successfully.");
    
    const userModel = mongoose.connection.collection("users");
    const hash = await bcrypt.hash("admin123", 10);
    
    // Existing admin ko remove karke fresh insert karte hain
    const result = await userModel.deleteOne({ email: "admin@examstrike.com" });
    console.log(`Deleted existing admin: ${result.deletedCount}`);
    
    await userModel.insertOne({
      name: "Super Admin",
      email: "admin@examstrike.com",
      passwordHash: hash,
      role: "admin",
      authProvider: "local",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("Admin account RE-CREATED and FIXED successfully!");
    console.log("Login with: admin@examstrike.com / admin123");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing admin:", error);
    process.exit(1);
  }
}

fix();
