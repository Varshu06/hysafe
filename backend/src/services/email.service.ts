import nodemailer from 'nodemailer';

export const sendOtpEmail = async (recipientEmail: string, otp: string): Promise<boolean> => {
  const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
  const SMTP_USER = (process.env.SMTP_USER || '').trim();
  const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const SMTP_HOST = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
  const SENDER_EMAIL = (process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || SMTP_USER || '').trim();
  const isDev = process.env.NODE_ENV !== 'production';

  console.log(`[EMAIL SERVICE] Initiating password reset email delivery to ${recipientEmail}`);

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

  // 1. Resend API Email Delivery (Recommended & Fastest)
  if (RESEND_API_KEY) {
    try {
      console.log(`[EMAIL SERVICE] Sending email via Resend API to ${recipientEmail}...`);
      // Use onboarding@resend.dev unless a custom verified domain is provided
      const fromAddress = process.env.RESEND_FROM_EMAIL || 'Hy-Safe Support <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipientEmail],
          subject: 'Hy-Safe Password Reset OTP Code',
          html: htmlContent,
        }),
      });

      const data = await response.json() as any;
      if (response.ok) {
        console.log(`[EMAIL SERVICE] Resend Email sent successfully. Message ID: ${data.id}`);
        return true;
      } else {
        console.error(`[EMAIL SERVICE] Resend API Error:`, data.message || data.error || 'Failed to send via Resend');
      }
    } catch (err: any) {
      console.error(`[EMAIL SERVICE] Resend network error:`, err.message);
    }
  }

  // 2. Production SMTP (Gmail / Custom SMTP fallback)
  if (SMTP_USER && SMTP_PASS) {
    try {
      console.log(`[EMAIL SERVICE] Sending email via SMTP (${SMTP_HOST}) to ${recipientEmail}...`);
      const transporter = nodemailer.createTransport({
        service: SMTP_HOST.includes('gmail') ? 'gmail' : undefined,
        host: !SMTP_HOST.includes('gmail') ? SMTP_HOST : undefined,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      const mailOptions = {
        from: SENDER_EMAIL || `"Hy-Safe Support" <${SMTP_USER}>`,
        to: recipientEmail,
        subject: 'Hy-Safe Password Reset OTP Code',
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL SERVICE] SMTP Email sent successfully to ${recipientEmail}`);
      return true;
    } catch (error: any) {
      console.error(`[EMAIL SERVICE] SMTP delivery failed:`, error.message);
    }
  }

  // 3. Development Fallback: Print OTP directly to console so development is never blocked
  if (isDev) {
    console.log(`\n======================================================`);
    console.log(`🔑 [DEV MODE] PASSWORD RESET OTP FOR: ${recipientEmail}`);
    console.log(`👉 OTP CODE: ${otp}`);
    console.log(`⏱️  VALID FOR: 10 MINUTES`);
    console.log(`======================================================\n`);
    return true;
  }

  console.error(`[EMAIL SERVICE] No transactional email provider configured or delivery failed.`);
  return false;
};

