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
  const db = client.db('tamizhtech');
  console.log('Connected to:', db.databaseName);
  const products = await db.collection('Product').countDocuments();
  const stockEntries = await db.collection('StockLedgerEntry').countDocuments();
  const clients = await db.collection('Client').countDocuments();
  const invoices = await db.collection('Invoice').countDocuments();
  const payments = await db.collection('Payment').countDocuments();
  console.log({ products, stockEntries, clients, invoices, payments });
  await client.close();
}
run().catch(console.error);
