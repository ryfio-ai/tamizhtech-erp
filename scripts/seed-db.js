const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwnkkZYMGW9EIhS9RF7BnqhtLpS_LESIBP400cB_mWu55KR2wIuiNtJEU5K0EC1_tJCFQ/exec";

// Helper to send data
async function appendData(sheetName, record) {
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "APPEND_ROW", sheet: sheetName, record }),
      redirect: "follow"
    });
    const text = await res.text();
    const json = JSON.parse(text);
    if (!json.success) throw new Error(json.error);
    console.log(`✅ Seeded ${sheetName} -> ${record.id}`);
  } catch (error) {
    console.error(`❌ Error seeding ${sheetName}:`, error.message);
  }
}

// Generate IDs
const c1 = "CLI-123401";
const c2 = "CLI-123402";
const c3 = "CLI-123403";

const inv1 = "INV-551101";
const inv2 = "INV-551102";

async function seed() {
  console.log("🌱 Starting Database Seed...");

  // 1. Clients
  const clients = [
    { id: c1, name: "Arun Kumar", phone: "9876543210", email: "arun@example.com", city: "Coimbatore", serviceType: "Robotics Workshop", source: "Walk-in", status: "Active", notes: "Excited about IoT", createdAt: new Date().toISOString() },
    { id: c2, name: "Sneha Reddy", phone: "8765432109", email: "sneha@example.com", city: "Chennai", serviceType: "Arduino Training", source: "Social Media", status: "Active", notes: "Wants weekend batches", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: c3, name: "PSG College", phone: "7654321098", email: "hod.ecs@psg.edu", city: "Coimbatore", serviceType: "Tamizh Robotics Club", source: "Referral", status: "Lead", notes: "Negotiating contract", createdAt: new Date(Date.now() - 172800000).toISOString() }
  ];

  for (const c of clients) await appendData("Clients", c);

  // 2. Invoices
  const invoices = [
    { 
      id: "INV-R-001", invoiceNo: inv1, clientId: c1, clientName: "Arun Kumar", 
      date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 7*86400000).toISOString().split('T')[0], 
      items: [{ description: "Robotics Level 1 Kit", qty: 1, unitPrice: 4500, amount: 4500 }], 
      gstPercent: 18, discountPercent: 0, subtotal: 4500, gstAmount: 810, discountAmount: 0, 
      total: 5310, paidAmount: 2000, balance: 3310, paymentStatus: "Partial", paymentMethod: "UPI", 
      notes: "First installment paid", createdAt: new Date().toISOString() 
    },
    { 
      id: "INV-R-002", invoiceNo: inv2, clientId: c2, clientName: "Sneha Reddy", 
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0], dueDate: new Date(Date.now() + 5*86400000).toISOString().split('T')[0], 
      items: [{ description: "Arduino Masterclass", qty: 1, unitPrice: 8000, amount: 8000 }], 
      gstPercent: 0, discountPercent: 10, subtotal: 8000, gstAmount: 0, discountAmount: 800, 
      total: 7200, paidAmount: 7200, balance: 0, paymentStatus: "Paid", paymentMethod: "Bank Transfer", 
      notes: "Full payment received", createdAt: new Date(Date.now() - 86400000).toISOString() 
    }
  ];

  for (const i of invoices) await appendData("Invoices", i);

  // 3. Payments
  const payments = [
    { id: "PAY-9901", paymentId: "PAY-9901", invoiceId: "INV-R-001", invoiceNo: inv1, clientId: c1, clientName: "Arun Kumar", amount: 2000, date: new Date().toISOString().split('T')[0], mode: "UPI", referenceNo: "UPI/8123019", notes: "Advance GPay", createdAt: new Date().toISOString() },
    { id: "PAY-9902", paymentId: "PAY-9902", invoiceId: "INV-R-002", invoiceNo: inv2, clientId: c2, clientName: "Sneha Reddy", amount: 7200, date: new Date(Date.now() - 40000000).toISOString().split('T')[0], mode: "Bank Transfer", referenceNo: "HDFC N12312", notes: "Cleared", createdAt: new Date().toISOString() }
  ];

  for (const p of payments) await appendData("Payments", p);

  // 4. FollowUps
  const followups = [
    { id: "FU-001", clientId: c3, clientName: "PSG College", date: new Date(Date.now() - 86400000).toISOString().split('T')[0], time: "10:00", mode: "Call", summary: "Discuss pricing for 50 students", nextAction: "Send revised proposal", status: "Overdue", createdAt: new Date().toISOString() },
    { id: "FU-002", clientId: c1, clientName: "Arun Kumar", date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: "14:30", mode: "Visit", summary: "Install kit at his lab", nextAction: "", status: "Pending", createdAt: new Date().toISOString() }
  ];

  for (const f of followups) await appendData("FollowUps", f);

  // 5. Applications
  const apps = [
    { id: "APP-811", applicationNo: "APP-811001", name: "Karthik Vijay", email: "karthik.v@test.com", phone: "9123456780", city: "Erode", appliedFor: "Drone Training", appliedDate: new Date().toISOString().split('T')[0], status: "New", source: "Website", notes: "Beginner level", emailSent: false, createdAt: new Date().toISOString() },
    { id: "APP-812", applicationNo: "APP-811002", name: "Divya Krishnan", email: "div.k@test.com", phone: "9456123780", city: "Coimbatore", appliedFor: "Internship", appliedDate: new Date(Date.now() - 100000000).toISOString().split('T')[0], status: "Contacted", source: "College", notes: "3rd year BE student", emailSent: true, createdAt: new Date().toISOString() }
  ];

  for (const a of apps) await appendData("Applications", a);

  console.log("🎉 Database Seed Complete!");
}

seed();
