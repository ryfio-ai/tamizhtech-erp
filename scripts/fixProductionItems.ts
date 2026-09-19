import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

function getDatabaseUrl(): string {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (!match) throw new Error("DATABASE_URL not found in .env");
  return match[1];
}

async function main() {
  const dbUrl = getDatabaseUrl();
  const client = new MongoClient(dbUrl);
  await client.connect();
  const db = client.db();

  console.log("Connected to MongoDB via native driver.");
  const items = await db.collection("ProductionItem").find().toArray();
  console.log("Found ProductionItems:", items.length);

  for (const item of items) {
    const update: any = {};
    if (item.unitCostPaise === null || item.unitCostPaise === undefined) {
      update.unitCostPaise = item.unitCost ? item.unitCost * 100 : 0;
    }
    if (item.totalCostPaise === null || item.totalCostPaise === undefined) {
      update.totalCostPaise = item.totalCost ? item.totalCost * 100 : 0;
    }
    if (item.quantityConsumedMinor === null || item.quantityConsumedMinor === undefined) {
      update.quantityConsumedMinor = item.quantityConsumed || 1;
    }
    if (Object.keys(update).length > 0) {
      console.log(`Updating ProductionItem ${item._id}:`, update);
      await db.collection("ProductionItem").updateOne({ _id: item._id }, { $set: update });
    }
  }

  const records = await db.collection("ProductionRecord").find().toArray();
  console.log("Found ProductionRecords:", records.length);

  for (const record of records) {
    const update: any = {};
    if (record.materialCostPaise === null || record.materialCostPaise === undefined) {
      update.materialCostPaise = record.materialCost ? record.materialCost * 100 : 0;
    }
    if (record.directCostPaise === null || record.directCostPaise === undefined) {
      update.directCostPaise = record.directCost ? record.directCost * 100 : 0;
    }
    if (record.totalProductionCostPaise === null || record.totalProductionCostPaise === undefined) {
      update.totalProductionCostPaise = record.totalProductionCost ? record.totalProductionCost * 100 : 0;
    }
    if (record.unitProductionCostPaise === null || record.unitProductionCostPaise === undefined) {
      update.unitProductionCostPaise = record.unitProductionCost ? record.unitProductionCost * 100 : 0;
    }
    if (record.quantityProducedMinor === null || record.quantityProducedMinor === undefined) {
      update.quantityProducedMinor = record.quantityProduced || 1;
    }
    if (Object.keys(update).length > 0) {
      console.log(`Updating ProductionRecord ${record._id}:`, update);
      await db.collection("ProductionRecord").updateOne({ _id: record._id }, { $set: update });
    }
  }

  console.log("[OK] ProductionItem and ProductionRecord backfill complete.");
  await client.close();
}

main().catch(console.error);
