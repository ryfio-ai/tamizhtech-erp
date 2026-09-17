const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=["']([^"']+)["']/);
const uri = match ? match[1] : '';

const client = new MongoClient(uri);

async function backup() {
  console.log('🔒 Starting pre-schema MongoDB backup...');
  await client.connect();
  const db = client.db('tamizhtech');
  
  const collections = await db.listCollections().toArray();
  const backupDir = path.join(__dirname, '..', 'backups', `backup-${Date.now()}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const summary = {};
  for (const col of collections) {
    const name = col.name;
    const docs = await db.collection(name).find({}).toArray();
    summary[name] = docs.length;
    if (docs.length > 0) {
      fs.writeFileSync(
        path.join(backupDir, `${name}.json`),
        JSON.stringify(docs, null, 2)
      );
    }
  }

  fs.writeFileSync(
    path.join(backupDir, 'summary.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), collections: summary }, null, 2)
  );

  console.log('✅ Backup completed successfully in:', backupDir);
  console.log('Collection summary:', summary);
  await client.close();
}

backup().catch(err => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
