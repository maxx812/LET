import mongoose from "mongoose";
import { config } from "../src/config/env.js";

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB for seeding...");
  
  const examTypeModel = mongoose.connection.collection("examtypes");
  
  const examTypes = [
    { name: "MPSC (State Services)", slug: "mpsc-state-services", status: "active", createdAt: new Date(), updatedAt: new Date() },
    { name: "Police Bharti", slug: "police-bharti", status: "active", createdAt: new Date(), updatedAt: new Date() },
    { name: "Talathi Bharti", slug: "talathi-bharti", status: "active", createdAt: new Date(), updatedAt: new Date() },
    { name: "Shikshak Bharti (TET/TAIT)", slug: "shikshak-bharti", status: "active", createdAt: new Date(), updatedAt: new Date() },
    { name: "Vanrakshak Bharti", slug: "vanrakshak-bharti", status: "active", createdAt: new Date(), updatedAt: new Date() }
  ];

  for (const et of examTypes) {
    await examTypeModel.updateOne(
      { slug: et.slug },
      { $setOnInsert: et },
      { upsert: true }
    );
  }

  console.log("Seeding completed successfully.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
