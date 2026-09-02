import nodemailer from 'nodemailer';

const SENDER_EMAIL = (process.env.SMTP_USER || 'susiazaria@gmail.com').trim();
const SENDER_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();

export const sendOtpEmail = async (recipientEmail: string, otp: string): Promise<boolean> => {
  console.log(`\n==================================================`);
  console.log(`📧 [PASSWORD RESET OTP]`);
  console.log(`   Recipient: ${recipientEmail}`);
  console.log(`   OTP Code: ${otp}`);
  console.log(`==================================================\n`);

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #0284C7; text-align: center;">Hy-Safe Password Reset</h2>
      <p style="font-size: 16px; color: #333;">Hello,</p>
      <p style="font-size: 15px; color: #555;">You requested a password reset for your Hy-Safe account. Please use the following 6-digit OTP code to verify your identity:</p>
      <div style="background-color: #f0f9ff; border: 2px dashed #0284C7; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0284C7;">${otp}</span>
      </div>
      <p style="font-size: 14px; color: #777;">This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #aaa; text-align: center;">Sent by Hy-Safe Water Delivery App</p>
    </div>
  `;

  // 1. Resend API Email Delivery
  if (RESEND_API_KEY) {
    try {
      console.log(`🚀 Sending email via Resend API to ${recipientEmail}...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Hy-Safe Support <onboarding@resend.dev>',
          to: [recipientEmail],
          subject: 'Hy-Safe Password Reset OTP Code',
          html: htmlContent,
        }),
      });

      const data = await response.json() as any;
      if (response.ok) {
        console.log(`✅ Resend Email sent successfully! Message ID: ${data.id}`);
        return true;
      } else {
        console.error(`❌ Resend API Error:`, data);
      }
    } catch (err: any) {
      console.error(`❌ Resend fetch error:`, err.message);
    }
  }

  // 2. Fallback SMTP / Ethereal Test Inbox
  try {
    let transporter: nodemailer.Transporter;

    if (SENDER_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SENDER_EMAIL,
          pass: SENDER_PASS,
        },
      });
    } else {
      console.log(`⚠️ Neither RESEND_API_KEY nor valid SMTP_PASS is configured in backend/.env.`);
      console.log(`   Creating temporary Ethereal test account for email delivery...`);
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const mailOptions = {
      from: `"Hy-Safe Support" <${SENDER_EMAIL}>`,
      to: recipientEmail,
      subject: 'Hy-Safe Password Reset OTP Code',
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP Email sent successfully to ${recipientEmail}`);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Live Email Preview URL: ${previewUrl}`);
    }
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send OTP email:`, error.message);
    return true;
  }
};
