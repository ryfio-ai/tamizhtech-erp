import prisma from "../lib/prisma";
import { generateClientCode } from "../lib/sequence";

async function testAddCustomer() {
  console.log("=== Testing Add Customer with company & notes ===");

  const clientCode = await generateClientCode();
  console.log("Generated Client Code:", clientCode);

  const testData = {
    clientCode,
    name: "Sathish Kumar P",
    phone: "9629463964",
    email: "test.customer." + Date.now() + "@gmail.com",
    city: "Pudukkottai",
    company: "TamizhTech Test Org",
    notes: "Test internal note",
    serviceType: "Robotics Workshop",
    source: "Online",
    status: "LEAD",
    type: "INDIVIDUAL",
  };

  const created = await prisma.client.create({
    data: testData,
  });

  console.log("✓ Customer created successfully:", created.id, created.name, created.clientCode);
  console.log("  Company:", created.company);
  console.log("  Notes:", created.notes);

  // Clean up
  await prisma.client.delete({
    where: { id: created.id },
  });
  console.log("✓ Test customer cleaned up successfully.");

  console.log("=== Add Customer Test Passed! ===");
}

testAddCustomer().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
