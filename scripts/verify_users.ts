import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      role: true,
    },
  });

  console.log("--- User Table ---");
  users.forEach((u) => {
    console.log(`${u.name} | ${u.email} | ${u.role}`);
  });

  const employees = await prisma.employee.findMany();
  console.log("\n--- Employee Table ---");
  employees.forEach((e) => {
    console.log(`${e.firstName} ${e.lastName} | ${e.employeeId} | ${e.designation}`);
  });

  const clients = await prisma.client.findMany({
    select: { name: true, clientCode: true, city: true }
  });
  console.log("\n--- Client Table ---");
  clients.forEach((c) => {
    console.log(`${c.name} | ${c.clientCode} | ${c.city}`);
  });

  const invoices = await prisma.invoice.findMany({
    select: { invoiceNo: true, clientName: true, total: true, status: true }
  });
  console.log("\n--- Invoice Table ---");
  invoices.forEach((i) => {
    console.log(`${i.invoiceNo} | ${i.clientName} | ₹${i.total} | ${i.status}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
