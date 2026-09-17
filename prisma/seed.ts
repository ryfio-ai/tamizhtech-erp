import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * PRODUCTION SEED FUNCTION
 * Safe, idempotent, non-destructive.
 * Seeds ONLY the single initial administrator, core sequences, and default system settings.
 * NEVER deletes or wipes any existing business records!
 */
async function seedProduction() {
  console.log('🌱 Executing safe production initialization...');

  // 1. Single ERP Administrator Account
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'erp@tamizhtech.in';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'TamizhTech Admin';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'TTRC@erp';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      passwordHash
    },
    create: {
      name: adminName,
      email: adminEmail,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      passwordHash
    }
  });
  console.log(`✅ Single Super Admin configured: ${adminUser.email}`);

  // Link baseline Employee record for founder
  await prisma.employee.upsert({
    where: { employeeId: 'TT-EMP-001' },
    update: {
      userId: adminUser.id,
      designation: 'Founder & CEO',
      department: 'Management'
    },
    create: {
      employeeId: 'TT-EMP-001',
      firstName: 'Tamizharasan',
      lastName: 'K',
      designation: 'Founder & CEO',
      department: 'Management',
      status: 'ACTIVE',
      userId: adminUser.id
    }
  });
  console.log('✅ Founder Employee record linked (TT-EMP-001)');

  // 2. Initialize Core Business Sequences (concurrency-safe counters)
  const currentYear = new Date().getFullYear();
  const coreSequences = [
    { name: 'INV', prefix: `TT-INV-${currentYear}`, year: currentYear },
    { name: 'QUO', prefix: `TT-QUO-${currentYear}`, year: currentYear },
    { name: 'ORD', prefix: `TT-ORD-${currentYear}`, year: currentYear },
    { name: 'LEAD', prefix: `TT-LD-${currentYear}`, year: currentYear },
    { name: 'CUS', prefix: `TT-CL-${currentYear}`, year: currentYear },
    { name: 'PAY', prefix: `TT-PAY-${currentYear}`, year: currentYear },
    { name: 'PO', prefix: `TT-PO-${currentYear}`, year: currentYear },
  ];

  for (const seq of coreSequences) {
    await prisma.businessSequence.upsert({
      where: { name: seq.name },
      update: { prefix: seq.prefix, year: seq.year },
      create: {
        name: seq.name,
        prefix: seq.prefix,
        year: seq.year,
        lastNumber: 0
      }
    });
  }
  console.log(`✅ Business Sequences initialized for ${currentYear}`);

  // 3. Central System Settings Defaults
  const systemDefaults = [
    { key: 'COMPANY_NAME', value: 'Tamizh Tech Robotics Company', category: 'GENERAL', description: 'Official company legal name' },
    { key: 'COMPANY_CITY', value: 'Coimbatore', category: 'GENERAL', description: 'Headquarters city' },
    { key: 'COMPANY_STATE', value: 'Tamil Nadu', category: 'GENERAL', description: 'Headquarters state' },
    { key: 'COMPANY_COUNTRY', value: 'India', category: 'GENERAL', description: 'Country' },
    { key: 'COMPANY_PHONE', value: '+91 8438686030', category: 'GENERAL', description: 'Official contact phone' },
    { key: 'COMPANY_EMAIL', value: 'contact@tamizhtech.in', category: 'GENERAL', description: 'Official contact email' },
    { key: 'COMPANY_WEBSITE', value: 'https://www.tamizhtech.in', category: 'GENERAL', description: 'Official public website' },
    { key: 'DEFAULT_GST_RATE', value: '18', category: 'FINANCE', description: 'Default GST tax percentage' },
    { key: 'CURRENCY_CODE', value: 'INR', category: 'FINANCE', description: 'Base transactional currency' },
    { key: 'CURRENCY_SYMBOL', value: '₹', category: 'FINANCE', description: 'Currency display symbol' },
  ];

  for (const setting of systemDefaults) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
        category: setting.category,
        description: setting.description,
        isPublic: true
      }
    });
  }
  console.log('✅ System Settings initialized');
}

/**
 * DEVELOPMENT TEST FIXTURES
 * Only executed when explicitly requested via SEED_DEV_FIXTURES=true in development.
 */
async function seedDevelopmentFixtures() {
  console.log('🧪 Seeding isolated development test fixtures...');
  // Development testing fixtures can be loaded here safely without affecting production
}

async function main() {
  try {
    await seedProduction();

    if (process.env.NODE_ENV === 'development' && process.env.SEED_DEV_FIXTURES === 'true') {
      await seedDevelopmentFixtures();
    }

    console.log('✨ Seed execution finished successfully.');
  } catch (error) {
    console.error('❌ Seed execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
