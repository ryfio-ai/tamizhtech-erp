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
  const sample = await db.collection('Client').find().toArray();
  console.log('Sample clients:', JSON.stringify(sample, null, 2));
  await client.close();
}
run().catch(console.error);
