const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { MongoClient } = require('mongodb');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=["']([^"']+)["']/);
const uri = match ? match[1] : '';

const client = new MongoClient(uri);
async function run() {
  await client.connect();
  const db = client.db();
  console.log('Connected to database:', db.databaseName);
  const count = await db.collection('Lead').countDocuments();
  console.log('Lead count in database:', count);
  const sample = await db.collection('Lead').find().limit(3).toArray();
  console.log('Sample leads:', JSON.stringify(sample, null, 2));
  await client.close();
}
run().catch(console.error);
