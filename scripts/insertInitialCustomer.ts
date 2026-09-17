import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';

// Read DATABASE_URL from .env
const envFile = fs.readFileSync('.env', 'utf8');
const match = envFile.match(/DATABASE_URL=["']([^"']+)["']/);
const uri = match ? match[1] : (process.env.DATABASE_URL || '');

if (!uri) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db('tamizhtech');
  console.log('Connected to MongoDB database:', db.databaseName);

  const customerData = {
    name: 'wesly shantharuban',
    company: 'joash electronics',
    phone: '+94769903781',
    email: 'jwsruban@gmail.com',
    city: 'Sri Lanka / Coimbatore',
    type: 'CORPORATE',
    status: 'LEAD',
    serviceType: 'PCB Services (Design + Fabrication + Assembly)',
    source: 'Website Quote Request',
    notes: 'Quote Request TT-20260914-611B (2026-09-14T14:17:14.990Z) | joash electronics (Sri Lanka). Category: PCB Services (Design + Fabrication + Assembly) | Quantity: 10 pcs | Schematic Status: Need CAD / 3D Design Support | Board Spec: 4-layer rigid PCB (approx 155 x 86.5 mm), designed to fit OKW RAILTEC C 9-module enclosure (B6706102). Requirement: PCB layout design and prototype support for an industrial LoRa remote I/O receiver module. KiCad project files, BOM, footprints and engineering requirements prepared. Quote separately for PCB layout/design, bare PCB fabrication, component cost and PCBA assembly.'
  };

  // Check if client already exists
  const existingClient = await db.collection('Client').findOne({
    $or: [
      { email: customerData.email },
      { phone: customerData.phone }
    ]
  });

  let clientDocId: ObjectId;
  let clientCode: string;

  if (existingClient) {
    clientDocId = existingClient._id;
    clientCode = existingClient.clientCode;
    console.log(`[INFO] Customer already exists with Code: ${clientCode} (ID: ${clientDocId})`);
    await db.collection('Client').updateOne(
      { _id: clientDocId },
      {
        $set: {
          company: customerData.company,
          city: customerData.city,
          notes: customerData.notes,
          serviceType: customerData.serviceType,
          updatedAt: new Date()
        }
      }
    );
    console.log('Updated existing customer record.');
  } else {
    // Generate atomic sequence code
    const seq = await db.collection('BusinessSequence').findOneAndUpdate(
      { key: 'CLIENT_CODE' },
      { $inc: { lastNumber: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const num = seq?.lastNumber || 1;
    clientCode = `TT-CLI-${String(num).padStart(4, '0')}`;

    const insertResult = await db.collection('Client').insertOne({
      clientCode,
      name: customerData.name,
      company: customerData.company,
      phone: customerData.phone,
      email: customerData.email,
      city: customerData.city,
      type: customerData.type,
      status: customerData.status,
      serviceType: customerData.serviceType,
      source: customerData.source,
      notes: customerData.notes,
      assignedToId: null,
      createdAt: new Date('2026-09-14T14:17:14.990Z'),
      updatedAt: new Date()
    });
    clientDocId = insertResult.insertedId;
    console.log(`[SUCCESS] Inserted Customer ${customerData.name} | Code: ${clientCode} (ID: ${clientDocId})`);
  }

  // Also record in Lead collection for CRM pipeline
  const existingLead = await db.collection('Lead').findOne({
    $or: [
      { externalId: 'TT-20260914-611B' },
      { email: customerData.email }
    ]
  });

  if (existingLead) {
    console.log(`[INFO] Lead already exists with Code: ${existingLead.leadCode}`);
  } else {
    const leadSeq = await db.collection('BusinessSequence').findOneAndUpdate(
      { key: 'LEAD_CODE' },
      { $inc: { lastNumber: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const leadNum = leadSeq?.lastNumber || 1;
    const leadCode = `TT-LEAD-${String(leadNum).padStart(4, '0')}`;

    await db.collection('Lead').insertOne({
      leadCode,
      name: customerData.name,
      company: customerData.company,
      email: customerData.email,
      phone: customerData.phone,
      status: 'NEW',
      source: 'WEBSITE',
      externalId: 'TT-20260914-611B',
      requirement: 'Industrial LoRa remote I/O receiver module - 10 pcs prototype. 4-layer rigid PCB (155 x 86.5 mm) for OKW RAILTEC C 9-module enclosure (B6706102). Need CAD / 3D design support, bare PCB fabrication, component sourcing and PCBA assembly.',
      notes: customerData.notes,
      assignedToId: null,
      createdAt: new Date('2026-09-14T14:17:14.990Z'),
      updatedAt: new Date()
    });
    console.log(`[SUCCESS] Inserted CRM Lead with Code: ${leadCode} (Ref: TT-20260914-611B)`);
  }

  // Summary
  const totalClients = await db.collection('Client').countDocuments();
  const totalLeads = await db.collection('Lead').countDocuments();
  console.log(`Total Customers in ERP: ${totalClients} | Total CRM Leads: ${totalLeads}`);

  await client.close();
}

run().catch((err) => {
  console.error('Error inserting initial customer:', err);
  process.exit(1);
});
