const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=["']([^"']+)["']/);
const uri = match ? match[1] : '';

const client = new MongoClient(uri);

async function fixDuplicateUser() {
  await client.connect();
  const db = client.db('tamizhtech');
  
  // Set Tamizharasan K's email to tamizh@tamizhtech.in
  await db.collection('User').updateOne(
    { _id: new ObjectId('6aaa4b6c46f284bc0a175302') },
    { $set: { email: 'tamizh@tamizhtech.in', name: 'Tamizharasan K' } }
  );

  // Ensure single active login erp@tamizhtech.in is SUPER_ADMIN
  await db.collection('User').updateOne(
    { _id: new ObjectId('6aaa4cd11681fca74b5b0d9b') },
    { $set: { role: 'SUPER_ADMIN' } }
  );

  const users = await db.collection('User').find({}).toArray();
  console.log('Fixed users in database:', users.map(u => ({ id: u._id.toString(), name: u.name, email: u.email, role: u.role })));
  await client.close();
}

fixDuplicateUser().catch(console.error);
