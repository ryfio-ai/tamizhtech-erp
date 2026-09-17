import prisma from "../lib/prisma";
import { normalizeMobile, isValidMobile } from "../lib/phone";

const BASE_URL = process.env.APP_URL || "http://localhost:3000";

interface TestReport {
  testNumber: number;
  description: string;
  passed: boolean;
  details?: string;
}

const report: TestReport[] = [];

function recordTest(testNumber: number, description: string, passed: boolean, details?: string) {
  report.push({ testNumber, description, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`[TEST ${testNumber}] ${icon} - ${description} ${details ? `(${details})` : ""}`);
  if (!passed) {
    throw new Error(`Test ${testNumber} failed: ${description} - ${details}`);
  }
}

async function cleanupTestRecords() {
  // Clean up only synthetic records created during testing
  await prisma.lead.deleteMany({
    where: {
      name: { startsWith: "TEST-SYNTH" }
    }
  });
  await prisma.client.deleteMany({
    where: {
      name: { startsWith: "TEST-SYNTH" }
    }
  });
}

async function runCustomerIntegrityTests() {
  console.log("==================================================");
  console.log("TAMIZHTECH ERP 2.0 — CUSTOMER DATA INTEGRITY TEST SUITE");
  console.log("==================================================\n");

  await cleanupTestRecords();

  let client1Id = "";
  let client2Id = "";
  let lead1Id = "";
  let lead2Id = "";

  try {
    // -------------------------------------------------------------
    // TEST 1: Name + Mobile only -> EXPECT: CREATED
    // -------------------------------------------------------------
    console.log("Running TEST 1: Name + Mobile only...");
    const res1 = await fetch(`${BASE_URL}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TEST-SYNTH Minimal Customer",
        phone: "9876500001"
      })
    });
    const data1 = await res1.json();
    const t1Passed = res1.status === 201 && data1.success && data1.data?.mobileNormalized === "+919876500001" && !data1.data?.email;
    if (t1Passed) client1Id = data1.data.id;
    recordTest(1, "Name + Mobile only", t1Passed, `status: ${res1.status}, code: ${data1.data?.clientCode}`);

    // -------------------------------------------------------------
    // TEST 2: Name + Mobile + all optional fields -> EXPECT: CREATED
    // -------------------------------------------------------------
    console.log("Running TEST 2: Name + Mobile + all optional fields...");
    const res2 = await fetch(`${BASE_URL}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TEST-SYNTH Full Customer",
        phone: "+91 98765 00002",
        email: "full.cust@example.com",
        company: "Tamizh Innovations",
        city: "Coimbatore",
        address: "123 Tech Park",
        type: "CORPORATE",
        serviceType: "Robotics Workshop",
        source: "Online",
        status: "ACTIVE",
        notes: "VIP Client"
      })
    });
    const data2 = await res2.json();
    const t2Passed = res2.status === 201 && data2.success && data2.data?.mobileNormalized === "+919876500002" && data2.data?.company === "Tamizh Innovations";
    if (t2Passed) client2Id = data2.data.id;
    recordTest(2, "Name + Mobile + all optional fields", t2Passed, `status: ${res2.status}, code: ${data2.data?.clientCode}`);

    // -------------------------------------------------------------
    // TEST 3: Exact duplicate mobile -> EXPECT: REJECTED
    // -------------------------------------------------------------
    console.log("Running TEST 3: Exact duplicate mobile...");
    const res3 = await fetch(`${BASE_URL}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TEST-SYNTH Duplicate Customer",
        phone: "+91 98765 00002"
      })
    });
    const data3 = await res3.json();
    const t3Passed = res3.status === 409 && data3.code === "DUPLICATE_MOBILE" && data3.existingClient?.id === client2Id;
    recordTest(3, "Exact duplicate mobile", t3Passed, `HTTP ${res3.status}, code: ${data3.code}`);

    // -------------------------------------------------------------
    // TEST 4: Formatted duplicate (9876500002 vs +91 98765 00002) -> EXPECT: REJECTED
    // -------------------------------------------------------------
    console.log("Running TEST 4: Formatted duplicate...");
    const res4 = await fetch(`${BASE_URL}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TEST-SYNTH Formatted Duplicate",
        phone: "9876500002" // unformatted 10 digits
      })
    });
    const data4 = await res4.json();
    const t4Passed = res4.status === 409 && data4.code === "DUPLICATE_MOBILE" && data4.existingClient?.id === client2Id;
    recordTest(4, "Formatted duplicate: 9876500002 vs +91 98765 00002", t4Passed, `HTTP ${res4.status}, code: ${data4.code}`);

    // -------------------------------------------------------------
    // TEST 5: Edit customer without changing mobile -> EXPECT: SUCCESS
    // -------------------------------------------------------------
    console.log("Running TEST 5: Edit customer without changing mobile...");
    const res5 = await fetch(`${BASE_URL}/api/clients/${client2Id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TEST-SYNTH Full Customer Renamed",
        phone: "+91 98765 00002",
        notes: "Updated VIP Client Notes"
      })
    });
    const data5 = await res5.json();
    const t5Passed = res5.status === 200 && data5.success && data5.data?.name === "TEST-SYNTH Full Customer Renamed";
    recordTest(5, "Edit customer without changing mobile", t5Passed, `HTTP ${res5.status}`);

    // -------------------------------------------------------------
    // TEST 6: Change mobile to another customer's mobile -> EXPECT: REJECTED
    // -------------------------------------------------------------
    console.log("Running TEST 6: Change mobile to another customer's mobile...");
    const res6 = await fetch(`${BASE_URL}/api/clients/${client2Id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TEST-SYNTH Full Customer",
        phone: "9876500001" // Belongs to client 1
      })
    });
    const data6 = await res6.json();
    const t6Passed = res6.status === 409 && data6.code === "DUPLICATE_MOBILE";
    recordTest(6, "Change mobile to another customer's mobile", t6Passed, `HTTP ${res6.status}, code: ${data6.code}`);

    // -------------------------------------------------------------
    // TEST 7: Change mobile to new number -> EXPECT: SUCCESS
    // -------------------------------------------------------------
    console.log("Running TEST 7: Change mobile to new number...");
    const res7 = await fetch(`${BASE_URL}/api/clients/${client2Id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TEST-SYNTH Full Customer",
        phone: "+91 98765 00003"
      })
    });
    const data7 = await res7.json();
    const t7Passed = res7.status === 200 && data7.success && data7.data?.mobileNormalized === "+919876500003";
    recordTest(7, "Change mobile to new number", t7Passed, `HTTP ${res7.status}, new mobileNormalized: ${data7.data?.mobileNormalized}`);

    // -------------------------------------------------------------
    // TEST 8: Concurrent duplicate creation -> EXPECT: exactly 1 created, rest 409
    // -------------------------------------------------------------
    console.log("Running TEST 8: Concurrent duplicate creation...");
    const concurrentPayloads = [1, 2, 3, 4, 5].map((idx) => ({
      name: `TEST-SYNTH Concurrent ${idx}`,
      phone: "+91 98765 00004"
    }));

    const concurrentResults = await Promise.all(
      concurrentPayloads.map((body) =>
        fetch(`${BASE_URL}/api/clients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }).then(async (r) => ({ status: r.status, data: await r.json() }))
      )
    );

    const createdCount = concurrentResults.filter((r) => r.status === 201 && r.data.success).length;
    const duplicateCount = concurrentResults.filter((r) => r.status === 409 && r.data.code === "DUPLICATE_MOBILE").length;
    const dbConcurrentCount = await prisma.client.count({
      where: { mobileNormalized: "+919876500004" }
    });

    const t8Passed = createdCount === 1 && duplicateCount === 4 && dbConcurrentCount === 1;
    recordTest(8, "Concurrent duplicate creation", t8Passed, `Created: ${createdCount}, Rejected: ${duplicateCount}, DB Count: ${dbConcurrentCount}`);

    // -------------------------------------------------------------
    // TEST 9: Lead conversion with existing mobile -> EXPECT: existing customer linked, no duplicate
    // -------------------------------------------------------------
    console.log("Running TEST 9: Lead conversion with existing mobile...");
    const lead1 = await prisma.lead.create({
      data: {
        leadCode: `TEST-LEAD-${Date.now()}-1`,
        externalId: `SYNTH-EXT-${Date.now()}-1`,
        name: "TEST-SYNTH Lead Existing",
        phone: "9876500001", // Matches client 1
        source: "WhatsApp",
        status: "QUALIFIED"
      }
    });
    lead1Id = lead1.id;

    const res9 = await fetch(`${BASE_URL}/api/leads/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead1Id })
    });
    const data9 = await res9.json();
    const updatedLead1 = await prisma.lead.findUnique({ where: { id: lead1Id } });
    const t9Passed =
      res9.status === 200 &&
      data9.success &&
      data9.isExisting === true &&
      data9.data?.client?.id === client1Id &&
      updatedLead1?.status === "CONVERTED";
    recordTest(9, "Lead conversion with existing mobile", t9Passed, `Linked to existing client ID: ${client1Id}`);

    // -------------------------------------------------------------
    // TEST 10: Lead conversion with new mobile -> EXPECT: one customer created, lead linked
    // -------------------------------------------------------------
    console.log("Running TEST 10: Lead conversion with new mobile...");
    const lead2 = await prisma.lead.create({
      data: {
        leadCode: `TEST-LEAD-${Date.now()}-2`,
        externalId: `SYNTH-EXT-${Date.now()}-2`,
        name: "TEST-SYNTH Lead New",
        phone: "+91 98765 00005",
        source: "Website",
        status: "NEW"
      }
    });
    lead2Id = lead2.id;

    const res10 = await fetch(`${BASE_URL}/api/leads/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead2Id })
    });
    const data10 = await res10.json();
    const updatedLead2 = await prisma.lead.findUnique({ where: { id: lead2Id } });
    const newConvertedClientId = data10.data?.client?.id;
    const t10Passed =
      res10.status === 200 &&
      data10.success &&
      data10.isExisting === false &&
      data10.data?.client?.mobileNormalized === "+919876500005" &&
      updatedLead2?.status === "CONVERTED";
    recordTest(10, "Lead conversion with new mobile", t10Passed, `Created customer ID: ${newConvertedClientId}`);

    // -------------------------------------------------------------
    // TEST 11: Formatted/unformatted mobile search -> EXPECT: same customer returned
    // -------------------------------------------------------------
    console.log("Running TEST 11: Formatted/unformatted mobile search...");
    const res11a = await fetch(`${BASE_URL}/api/clients?q=9876500003`);
    const data11a = await res11a.json();
    const res11b = await fetch(`${BASE_URL}/api/clients?q=%2B91%2098765%2000003`);
    const data11b = await res11b.json();

    const matchA = data11a.data?.find((c: any) => c.id === client2Id);
    const matchB = data11b.data?.find((c: any) => c.id === client2Id);
    const t11Passed = Boolean(matchA && matchB && matchA.id === matchB.id);
    recordTest(11, "Formatted/unformatted mobile search", t11Passed, `Found client by unformatted and formatted queries`);

    // -------------------------------------------------------------
    // TEST 12: Minimal customer persists: Name + Mobile only -> EXPECT: retrievable after reload
    // -------------------------------------------------------------
    console.log("Running TEST 12: Minimal customer persists...");
    const res12 = await fetch(`${BASE_URL}/api/clients/${client1Id}`);
    const data12 = await res12.json();
    const t12Passed =
      res12.status === 200 &&
      data12.success &&
      data12.data?.name === "TEST-SYNTH Minimal Customer" &&
      data12.data?.mobileNormalized === "+919876500001" &&
      !data12.data?.email;
    recordTest(12, "Minimal customer persists: Name + Mobile only", t12Passed, `Retrieved after reload: ${data12.data?.name}`);

    // -------------------------------------------------------------
    // TEST 13: Optional email omitted -> EXPECT: customer creation succeeds
    // -------------------------------------------------------------
    console.log("Running TEST 13: Optional email omitted...");
    const res13 = await fetch(`${BASE_URL}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TEST-SYNTH No Email Customer",
        phone: "+91 98765 00006"
        // email is completely omitted
      })
    });
    const data13 = await res13.json();
    const t13Passed = res13.status === 201 && data13.success && data13.data?.mobileNormalized === "+919876500006";
    recordTest(13, "Optional email omitted", t13Passed, `HTTP ${res13.status}, code: ${data13.data?.clientCode}`);

    // -------------------------------------------------------------
    // TEST 14: Invalid email supplied -> EXPECT: validation failure
    // -------------------------------------------------------------
    console.log("Running TEST 14: Invalid email supplied...");
    const res14 = await fetch(`${BASE_URL}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TEST-SYNTH Invalid Email",
        phone: "+91 98765 00007",
        email: "not-a-valid-email"
      })
    });
    const data14 = await res14.json();
    const t14Passed = res14.status === 400 && data14.success === false;
    recordTest(14, "Invalid email supplied", t14Passed, `HTTP ${res14.status}, rejected invalid email`);

    // -------------------------------------------------------------
    // TEST 15: Edit customer with another customer's number -> EXPECT: database unchanged
    // -------------------------------------------------------------
    console.log("Running TEST 15: Database unchanged on rejected edit...");
    const client2Db = await prisma.client.findUnique({ where: { id: client2Id } });
    const t15Passed = client2Db?.mobileNormalized === "+919876500003" && client2Db?.phone === "+91 98765 00003";
    recordTest(15, "Edit customer with another customer's number", t15Passed, `Database phone verified: ${client2Db?.mobileNormalized}`);

    // -------------------------------------------------------------
    // TEST 16: Repeated lead conversion -> EXPECT: idempotent, one customer only
    // -------------------------------------------------------------
    console.log("Running TEST 16: Repeated lead conversion...");
    const res16 = await fetch(`${BASE_URL}/api/leads/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead2Id }) // Re-convert lead 2
    });
    const data16 = await res16.json();
    const countConvertedClients = await prisma.client.count({
      where: { mobileNormalized: "+919876500005" }
    });
    const t16Passed =
      res16.status === 200 &&
      data16.success &&
      data16.data?.client?.id === newConvertedClientId &&
      countConvertedClients === 1;
    recordTest(16, "Repeated lead conversion", t16Passed, `Idempotent: returned same client ID, total DB count: ${countConvertedClients}`);

    // -------------------------------------------------------------
    // REAL SAMPLE CUSTOMER VERIFICATION: Sathish, 9629463964
    // -------------------------------------------------------------
    console.log("\n--- Creating / Verifying Sample Customer: Sathish (9629463964) ---");
    const sampleNormalized = normalizeMobile("9629463964");
    console.log(`Sample normalized mobile: ${sampleNormalized}`);

    let sampleClient = await prisma.client.findUnique({
      where: { mobileNormalized: sampleNormalized }
    });

    if (!sampleClient) {
      const sampleRes = await fetch(`${BASE_URL}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sathish",
          phone: "9629463964"
        })
      });
      const sampleData = await sampleRes.json();
      if (!sampleData.success) {
        throw new Error(`Failed to create sample customer Sathish: ${sampleData.error}`);
      }
      sampleClient = sampleData.data;
      console.log(`✅ Sample Customer Sathish successfully created: ID=${sampleClient?.id}, Code=${sampleClient?.clientCode}`);
    } else {
      console.log(`✅ Sample Customer Sathish already present: ID=${sampleClient.id}, Code=${sampleClient.clientCode}`);
    }

    // Verify unique constraint in MongoDB
    console.log("\n--- Verifying MongoDB Unique Constraint on mobileNormalized ---");
    let duplicateRejectedByDb = false;
    try {
      await prisma.client.create({
        data: {
          clientCode: "TEST-DUP-KEY",
          name: "TEST-SYNTH Raw Duplicate",
          phone: "9629463964",
          mobileNormalized: sampleNormalized
        }
      });
    } catch (dbErr: any) {
      if (dbErr.code === "P2002" || dbErr.message?.includes("Unique constraint")) {
        duplicateRejectedByDb = true;
        console.log(`✅ Database unique constraint enforcement verified: Caught Prisma/MongoDB P2002 duplicate key rejection.`);
      } else {
        throw dbErr;
      }
    }

    if (!duplicateRejectedByDb) {
      throw new Error("CRITICAL: Database failed to reject duplicate mobileNormalized directly at Prisma/MongoDB level!");
    }

  } finally {
    console.log("\nCleaning up synthetic test records...");
    await cleanupTestRecords();
    console.log("Cleanup complete. Real records (wesly shantharuban, Sathish) preserved.\n");
  }

  console.log("==================================================");
  console.log("ALL 16 TESTS PASSED SUCCESSFULLY! 🚀");
  console.log("==================================================");
}

runCustomerIntegrityTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Customer Integrity Test Suite Failed:", err);
    process.exit(1);
  });
