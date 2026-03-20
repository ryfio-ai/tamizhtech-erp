import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  const mailOptions = {
    from: `"TamizhTech" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

export const getInvoiceEmailTemplate = (clientName: string, invoiceNo: string, amount: string, dueDate: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
    <div style="background-color: #C0392B; padding: 40px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 28px;">TamizhTech</h1>
      <p style="margin-top: 5px; opacity: 0.8;">New Invoice Generated</p>
    </div>
    <div style="padding: 40px; color: #1A1A2E;">
      <p>Dear <strong>${clientName}</strong>,</p>
      <p>A new invoice <strong>#${invoiceNo}</strong> has been generated for your recent services with TamizhTech.</p>
      
      <div style="background-color: #f9f9f9; padding: 25px; border-radius: 15px; margin: 30px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #888; font-size: 12px; text-transform: uppercase;">Amount Due</td>
            <td style="text-align: right; font-weight: bold; font-size: 20px;">${amount}</td>
          </tr>
          <tr>
            <td style="color: #888; font-size: 12px; text-transform: uppercase; padding-top: 10px;">Due Date</td>
            <td style="text-align: right; padding-top: 10px;">${dueDate}</td>
          </tr>
        </table>
      </div>

      <p>Please ensure payment is made before the due date to avoid any service interruptions.</p>
      
      <div style="text-align: center; margin-top: 40px;">
        <a href="https://www.tamizhtech.in" style="background-color: #C0392B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold;">View Details</a>
      </div>
    </div>
    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #888; font-size: 12px;">
      &copy; 2024 TamizhTech. Coimbatore, Tamil Nadu, India.
    </div>
  </div>
`;

export const getPaymentEmailTemplate = (clientName: string, amount: string, paymentId: string, invoiceNo: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
    <div style="background-color: #27ae60; padding: 40px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 28px;">Payment Received!</h1>
      <p style="margin-top: 5px; opacity: 0.8;">Thank you for your business</p>
    </div>
    <div style="padding: 40px; color: #1A1A2E;">
      <p>Dear <strong>${clientName}</strong>,</p>
      <p>We have successfully received your payment of <strong>${amount}</strong> for Invoice <strong>#${invoiceNo}</strong>.</p>
      
      <div style="background-color: #f9f9f9; padding: 25px; border-radius: 15px; margin: 30px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #888; font-size: 12px; text-transform: uppercase;">Receipt ID</td>
            <td style="text-align: right; font-weight: bold;">#${paymentId}</td>
          </tr>
          <tr>
            <td style="color: #888; font-size: 12px; text-transform: uppercase; padding-top: 10px;">Amount Paid</td>
            <td style="text-align: right; font-weight: bold; color: #27ae60;">${amount}</td>
          </tr>
        </table>
      </div>

      <p>A formal receipt will be available in your portal shortly.</p>
    </div>
    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #888; font-size: 12px;">
      &copy; 2024 TamizhTech. Coimbatore, Tamil Nadu, India.
    </div>
  </div>
`;
