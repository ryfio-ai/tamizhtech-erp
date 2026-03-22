import { PrismaClient } from '@prisma/client';
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting universal seed...');

  // 0. Clean Database
  await prisma.application.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.chartOfAccount.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.employee.deleteMany();
  // We keep the super admin user to avoid session issues, just upsert it

  // 1. Create Default Password for all users
  const passwordHash = await bcrypt.hash("Admin@123", 10);

  // 1. Create Users for Each Role
  const users = [
    { name: 'Tamizharasan K', email: 'tamizharasan@tamizhtech.in', role: 'SUPER_ADMIN' },
    { name: 'Suraj A', email: 'suraj@tamizhtech.in', role: 'ADMIN' },
    { name: 'Dhanush S', email: 'dhanush@tamizhtech.in', role: 'ADMIN' },
    { name: 'Sathish P', email: 'sathish@tamizhtech.in', role: 'ADMIN' },
    { name: 'Chenjitha', email: 'chenjitha@tamizhtech.in', role: 'ADMIN' },
    { name: 'Poongothai Subiksha M', email: 'subiksha@tamizhtech.in', role: 'ADMIN' },
    { name: 'Kumara Dharshini T', email: 'dharshini@tamizhtech.in', role: 'ADMIN' },
    { name: 'Aananth S', email: 'aananth@tamizhtech.in', role: 'ADMIN' },
    { name: 'Sukeshan', email: 'sukeshan@tamizhtech.in', role: 'ADMIN' },
    { name: 'Dharanish K B', email: 'dharanish@tamizhtech.in', role: 'ADMIN' },
    { name: 'Yuvaraj K', email: 'yuvaraj@tamizhtech.in', role: 'ADMIN' },
    { name: 'Kowsik K', email: 'kowsik@tamizhtech.in', role: 'ADMIN' },
  ];

  const createdUsers: any[] = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role },
      create: { ...u, passwordHash, status: 'ACTIVE' },
    });
    createdUsers.push(user);
    console.log(`- Created ${u.role}: ${u.email}`);
  }

  // 2. Create Employees linked to users
  const teamMembers = [
    { name: "Tamizharasan K", designation: "Founder & CEO", department: "Management", email: "tamizharasan@tamizhtech.in" },
    { name: "Suraj A", designation: "Co-founder & COO", department: "Operations", email: "suraj@tamizhtech.in" },
    { name: "Dhanush S", designation: "Co-founder & CTO", department: "Technology", email: "dhanush@tamizhtech.in" },
    { name: "Sathish P", designation: "CIO", department: "Technology", email: "sathish@tamizhtech.in" },
    { name: "Chenjitha", designation: "CFO", department: "Finance", email: "chenjitha@tamizhtech.in" },
    { name: "Poongothai Subiksha M", designation: "CMO", department: "Marketing", email: "subiksha@tamizhtech.in" },
    { name: "Kumara Dharshini T", designation: "HR & Operations", department: "HR", email: "dharshini@tamizhtech.in" },
    { name: "Aananth S", designation: "Product & Dev Officer", department: "Product", email: "aananth@tamizhtech.in" },
    { name: "Sukeshan", designation: "R&D Head", department: "R&D", email: "sukeshan@tamizhtech.in" },
    { name: "Dharanish K B", designation: "PR Team Head", department: "PR", email: "dharanish@tamizhtech.in" },
    { name: "Yuvaraj K", designation: "Robotics Engineer", department: "Engineering", email: "yuvaraj@tamizhtech.in" },
    { name: "Kowsik K", designation: "Embedded Systems Engineer", department: "Engineering", email: "kowsik@tamizhtech.in" },
  ];

  for (let i = 0; i < teamMembers.length; i++) {
    const m = teamMembers[i];
    const user = createdUsers.find(u => u.email === m.email);
    const empId = `TT-EMP-${String(i + 1).padStart(3, '0')}`;
    
    await prisma.employee.upsert({
      where: { employeeId: empId },
      update: { userId: user.id, designation: m.designation, department: m.department },
      create: {
        employeeId: empId,
        firstName: m.name.split(' ')[0],
        lastName: m.name.split(' ').slice(1).join(' ') || '',
        designation: m.designation,
        department: m.department,
        status: 'ACTIVE',
        userId: user.id,
      },
    });
    console.log(`- Linked Employee: ${m.name} (${empId})`);
  }

  const admin = createdUsers[0];

  // 3. Create Clients & Leads
  const client1 = await prisma.client.create({
    data: {
      clientCode: 'TT-CL-001',
      name: 'PSG College of Technology',
      type: 'COLLEGE',
      status: 'ACTIVE',
      phone: '0422 257 2177',
      email: 'principal@psgtech.edu',
      city: 'Coimbatore',
      assignedToId: admin.id,
    },
  });

  const lead1 = await prisma.lead.create({
    data: {
      leadCode: 'TT-LD-001',
      name: 'Innovation Hub',
      email: 'contact@innovhub.com',
      phone: '9876543210',
      status: 'QUALIFIED',
      assignedToId: admin.id,
    },
  });

  // 4. Create Invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNo: 'TT-INV-1001',
      clientId: client1.id,
      clientName: client1.name,
      status: 'PAID',
      date: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subtotal: 50000,
      gstAmount: 9000,
      total: 59000,
      paidAmount: 59000,
      balance: 0,
      items: {
        create: [
          { description: 'Robotics Workshop Level 1', qty: 10, unitPrice: 5000, amount: 50000 },
        ],
      },
      payments: {
        create: [
          {
            paymentNo: 'PAY-1001',
            clientId: client1.id,
            amount: 59000,
            mode: 'UPI',
            status: 'COMPLETED',
            transactionId: 'TXN123456789',
          },
        ],
      },
    },
  });

  // 5. Create Accounting (Chart of Accounts)
  await prisma.chartOfAccount.createMany({
    data: [
      { code: '1000', name: 'Cash in Hand', type: 'ASSET', subType: 'CURRENT_ASSET', balance: 50000 },
      { code: '4000', name: 'Service Revenue', type: 'REVENUE', subType: 'OPERATING_REVENUE', balance: 50000 },
    ],
  });

  // 6. Create Projects & Tasks
  const project1 = await prisma.project.create({
    data: {
      name: 'Robotic Lab Setup - PSG',
      clientId: client1.id,
      status: 'IN_PROGRESS',
      createdById: admin.id,
      managerId: admin.id,
      tasks: {
        create: [
          { title: 'Inventory Checklist', status: 'DONE', priority: 'HIGH', createdById: admin.id },
          { title: 'Equipment Installation', status: 'IN_PROGRESS', priority: 'URGENT', createdById: admin.id },
        ],
      },
    },
  });

  // 7. Create Support Ticket
  await prisma.supportTicket.create({
    data: {
      ticketNo: 'TKT-001',
      subject: 'Sensor calibration issue',
      status: 'OPEN',
      priority: 'HIGH',
      assignedToId: admin.id,
    },
  });

  // 8. Create Application
  await prisma.application.create({
    data: {
      appNo: 'APP-2024-001',
      clientId: client1.id,
      course: 'Advanced Robotics Cert',
      status: 'ENROLLED',
    },
  });

  // 9. Import Past Client Tracker Data
  const pastClients = [
    { name: 'Kanisha', phone: '9791509761', email: 'kanishasubish@gmail.com', city: 'Coimbatore', service: 'Project', date: '2026-03-19', amount: 5000, paid: 2500, balance: 2500, status: 'PARTIAL', notes: 'Advance Paid' },
    { name: 'Mohan', phone: '9363995859', email: 'mohan@pending.com', city: 'Coimbatore', service: 'Project', date: '2026-03-16', amount: 8500, paid: 0, balance: 8500, status: 'UNPAID', notes: 'Bending (Pending)' },
    { name: 'Rohith M', phone: '7207076775', email: 'rohith@completed.com', city: 'Chennai', service: 'Service', date: '2026-03-14', amount: 50000, paid: 50000, balance: 0, status: 'PAID', notes: '' },
    { name: 'Vijay Raghavan', phone: '9894287199', email: 'vijay@completed.com', city: 'Thanjavur', service: 'Service', date: '2026-03-18', amount: 3500, paid: 3500, balance: 0, status: 'PAID', notes: '' },
    { name: 'Arun Prakash', phone: '', email: 'arunprakash@guvi.in', city: 'Chennai', service: 'Service', date: '2026-03-09', amount: 22982, paid: 22982, balance: 0, status: 'PAID', notes: '' },
  ];

  for (let i = 0; i < pastClients.length; i++) {
    const pc = pastClients[i];
    const clientCode = `TT-CL-${String(i + 2).padStart(3, '0')}`;
    const invoiceNo = `TT-INV-${1002 + i}`;

    const client = await prisma.client.create({
      data: {
        clientCode,
        name: pc.name,
        phone: pc.phone || 'N/A',
        email: pc.email || `${pc.name.toLowerCase().replace(' ', '')}@placeholder.com`,
        city: pc.city,
        status: 'ACTIVE',
        assignedToId: admin.id,
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clientId: client.id,
        clientName: client.name,
        status: pc.status === 'PAID' ? 'PAID' : (pc.status === 'PARTIAL' ? 'PARTIALLY_PAID' : 'UNPAID'),
        date: new Date(pc.date),
        dueDate: new Date(new Date(pc.date).getTime() + 7 * 24 * 60 * 60 * 1000),
        subtotal: pc.amount / 1.18, // Assuming 18% GST inclusive if not specified
        gstAmount: pc.amount - (pc.amount / 1.18),
        total: pc.amount,
        paidAmount: pc.paid,
        balance: pc.balance,
        items: {
          create: [
            { description: pc.service, qty: 1, unitPrice: pc.amount, amount: pc.amount },
          ],
        },
      },
    });

    if (pc.paid > 0) {
      await prisma.payment.create({
        data: {
          paymentNo: `PAY-${2000 + i}`,
          clientId: client.id,
          invoiceId: invoice.id,
          amount: pc.paid,
          date: new Date(pc.date),
          mode: 'UPI',
          status: 'COMPLETED',
        },
      });
    }
    
    console.log(`- Imported Client: ${pc.name} | Invoice: ${invoiceNo}`);
  }

  // 10. Create Sample Expenses
  const categories = ["OFFICE", "MARKETING", "TRAVEL", "SALARY", "INFRASTRUCTURE", "MISCELLANEOUS"];
  const expenses = [
    { expenseNo: "EXP-1001", category: "OFFICE", amount: 1500, description: "Monthly Rent & Utility", date: "2026-03-01" },
    { expenseNo: "EXP-1002", category: "MARKETING", amount: 3000, description: "Social Media Ads", date: "2026-03-05" },
    { expenseNo: "EXP-1003", category: "TRAVEL", amount: 800, description: "Client Site Visit", date: "2026-03-10" },
    { expenseNo: "EXP-1004", category: "INFRASTRUCTURE", amount: 5000, description: "New Server Setup", date: "2026-02-15" },
    { expenseNo: "EXP-1005", category: "MISCELLANEOUS", amount: 500, description: "Refreshments", date: "2026-03-12" },
  ];

  for (const exp of expenses) {
    await prisma.expense.upsert({
      where: { expenseNo: exp.expenseNo },
      update: { amount: exp.amount, category: exp.category, status: "APPROVED" },
      create: {
        expenseNo: exp.expenseNo,
        category: exp.category,
        amount: exp.amount,
        description: exp.description,
        status: "APPROVED",
        date: new Date(exp.date),
        createdById: admin.id,
        approvedById: admin.id,
      },
    });
    console.log(`- Created Expense: ${exp.expenseNo} (${exp.category})`);
  }

  // 9. Create Activity & Audit Logs
  const superAdmin = createdUsers.find(u => u.role === 'SUPER_ADMIN');
  
  if (superAdmin) {
    await prisma.activityLog.createMany({
      data: [
        { userId: superAdmin.id, module: 'AUTH', action: 'LOGIN', details: 'Successful login' },
        { userId: superAdmin.id, module: 'FINANCE', action: 'VIEW_DASHBOARD', details: 'Accessed financial overview' },
        { userId: superAdmin.id, module: 'PROJECTS', action: 'VIEW_LIST', details: 'Browsing projects' },
        { userId: superAdmin.id, module: 'CLIENTS', action: 'SEARCH', details: 'Searched for "Kanisha"' },
      ]
    });

    await prisma.auditLog.createMany({
      data: [
        { 
          userId: superAdmin.id, 
          module: 'CLIENTS', 
          action: 'CREATE', 
          newData: JSON.stringify({ name: 'Arun Prakash', email: 'arunprakash@guvi.in' }) 
        },
        { 
          userId: superAdmin.id, 
          module: 'PROJECTS', 
          action: 'UPDATE', 
          oldData: JSON.stringify({ status: 'PLANNING' }),
          newData: JSON.stringify({ status: 'IN_PROGRESS' }) 
        },
        { 
          userId: superAdmin.id, 
          module: 'INVOICES', 
          action: 'DELETE', 
          oldData: JSON.stringify({ invoiceNo: 'TT-INV-000' }) 
        },
      ]
    });
    console.log(`- Created Sample Audit & Activity Logs`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
