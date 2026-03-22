export const emailTemplates = {
  
  // 1. New Lead Welcome Email
  leadWelcome: (name: string, service: string) => ({
    subject: `Welcome to TamizhTech! Inquiry Received for ${service}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A2E;">
        <h2 style="color: #C0392B;">Hello ${name},</h2>
        <p>Thank you for expressing interest in our <strong>${service}</strong> program at TamizhTech.</p>
        <p>We have successfully received your application. One of our technical experts will reach out to you shortly to discuss the next steps and answer any questions you might have.</p>
        <p>In the meantime, feel free to explore our website to learn more about our robotics and tech initiatives.</p>
        <br>
        <p>Warm regards,</p>
        <p><strong>The TamizhTech Team</strong><br>
        Hosur, Tamil Nadu<br>
        +91 8148045030</p>
      </div>
    `
  }),

  // 2. Invoice Generation Email
  invoiceStandard: (name: string, invoiceNo: string, amount: string, dueDate: string) => ({
    subject: `Invoice ${invoiceNo} from TamizhTech`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A2E;">
        <h2 style="color: #C0392B;">Hi ${name},</h2>
        <p>I hope this email finds you well.</p>
        <p>Please find attached your invoice <strong>${invoiceNo}</strong> for the amount of <strong>${amount}</strong>.</p>
        <p>Payment is due by <strong>${dueDate}</strong>. We appreciate your prompt payment.</p>
        <p>If you have any questions, please let us know.</p>
        <br>
        <p>Thank you for your business!</p>
        <p><strong>TamizhTech Accounts</strong><br>
        tamizhtechpvtltd@gmail.com</p>
      </div>
    `
  }),

  // 3. Payment Receipt Email
  paymentReceipt: (name: string, receiptNo: string, amount: string, invoiceNo: string, balance: string) => ({
    subject: `Payment Receipt ${receiptNo} - TamizhTech`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A2E;">
        <h2 style="color: #10b981;">Payment Received</h2>
        <p>Hi ${name},</p>
        <p>Thank you for your payment of <strong>${amount}</strong> towards Invoice <strong>${invoiceNo}</strong>.</p>
        <p>Your payment has been recorded successfully. Outstanding balance on this invoice is now: <strong>${balance}</strong>.</p>
        <br>
        <p>Thank you for choosing TamizhTech!</p>
        <p><strong>TamizhTech Accounts</strong></p>
      </div>
    `
  }),

  // 4. Custom Broadcast Base (Can be populated dynamically)
  customBroadcast: (subject: string, htmlContent: string) => ({
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A2E; line-height: 1.6;">
        ${htmlContent}
      </div>
    `
  })
};
