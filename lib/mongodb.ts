import { MongoClient, Db } from 'mongodb';
import dns from 'dns';

// Ensure DNS resolution reliability
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Retain default host DNS if restricted
}

const uri = process.env.DATABASE_URL || '';
const dbName = 'tamizhtech';

if (!uri && process.env.NODE_ENV === 'production') {
  throw new Error('Please define the DATABASE_URL environment variable inside .env');
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    return Promise.reject(new Error('DATABASE_URL not set'));
  }
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 15000,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 20000,
  });
  return client.connect();
}

let clientPromise: Promise<MongoClient>;

if (!global._mongoClientPromise) {
  global._mongoClientPromise = createClientPromise();
}
clientPromise = global._mongoClientPromise;

export async function getMongoClient(): Promise<MongoClient> {
  try {
    return await clientPromise;
  } catch (err) {
    // If disconnected or failed, refresh promise
    global._mongoClientPromise = createClientPromise();
    clientPromise = global._mongoClientPromise;
    return await clientPromise;
  }
}

export async function getMongoDb(): Promise<Db> {
  const connectedClient = await getMongoClient();
  return connectedClient.db();
}

export default clientPromise;

