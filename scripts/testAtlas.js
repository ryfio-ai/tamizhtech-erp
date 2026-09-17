const dns = require('dns');
// Set public DNS servers to resolve SRV records on Windows networks if local DNS blocks SRV
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { MongoClient } = require('mongodb');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=["']([^"']+)["']/);
if (!match) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const uri = match[1];
console.log('Attempting connection to MongoDB Atlas Cluster0 with Google DNS...');

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    const db = client.db('tamizhtech_erp');
    const ping = await db.command({ ping: 1 });
    console.log('✅ Database ping response:', ping);
    const collections = await db.listCollections().toArray();
    console.log('Collections in tamizhtech_erp:', collections.map(c => c.name));
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  } finally {
    await client.close();
  }
}

run();
