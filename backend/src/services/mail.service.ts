import nodemailer from 'nodemailer';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Only initialize transporter if SMTP credentials are provided
    if (env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // True for 465, false for others
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      logger.info('SMTP credentials missing. Mail service running in DEVELOPMENT console-logger fallback mode.');
    }
  }

  public async sendOtpEmail(email: string, otpCode: string, purpose: 'signup' | 'password_reset'): Promise<void> {
    const subject = purpose === 'signup' 
      ? 'Verify Your AgFlix Registration' 
      : 'Reset Your AgFlix Account Password';

    const bodyText = purpose === 'signup'
      ? `Welcome to AgFlix! Your verification code is: ${otpCode}. It is valid for 5 minutes. Do not share this code.`
      : `You requested a password reset on AgFlix. Your code is: ${otpCode}. It is valid for 5 minutes. If you did not request this, please ignore this email.`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #05070F; color: #F4F5F7; padding: 40px 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8A3FFC; margin: 0; font-size: 32px; letter-spacing: 2px;">AgFlix</h1>
        </div>
        <div style="background-color: #0F1221; border: 1px solid rgba(255, 255, 255, 0.08); padding: 30px; border-radius: 8px;">
          <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">${subject}</h2>
          <p style="color: #98A2B3; font-size: 16px; line-height: 1.5;">${bodyText.split(':')[0]}:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 36px; font-weight: bold; color: #00F0FF; letter-spacing: 4px; background: rgba(0, 240, 255, 0.1); padding: 10px 24px; border-radius: 4px; border: 1px solid rgba(0, 240, 255, 0.3);">${otpCode}</span>
          </div>
          <p style="color: #98A2B3; font-size: 14px; margin-bottom: 0;">This OTP code will expire in <strong>5 minutes</strong>. If you did not trigger this request, please contact our support immediately.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #98A2B3;">
          &copy; 2026 AgFlix, Inc. All rights reserved.
        </div>
      </div>
    `;

    await this.sendMail({
      to: email,
      subject,
      text: bodyText,
      html: htmlContent,
    });
  }

  public async sendNewDeviceNotification(
    email: string,
    ipAddress: string,
    browser: string,
    os: string,
    location: string
  ): Promise<void> {
    const subject = '🔒 AgFlix Security Alert: New Login Detected';
    const text = `A new login was detected on your AgFlix account from a new device.\n\nDetails:\nIP Address: ${ipAddress}\nBrowser: ${browser}\nOS: ${os}\nLocation: ${location}\n\nIf this was you, you can safely ignore this mail. If not, please change your password and terminate all active sessions immediately.`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #05070F; color: #F4F5F7; padding: 40px 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FF007A; margin: 0; font-size: 32px; letter-spacing: 2px;">AgFlix Security</h1>
        </div>
        <div style="background-color: #0F1221; border: 1px solid rgba(255, 255, 255, 0.08); padding: 30px; border-radius: 8px;">
          <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">New Device Login Detected</h2>
          <p style="color: #98A2B3; font-size: 15px; line-height: 1.5;">We detected a successful login to your AgFlix account from a new device we don't recognize.</p>
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 15px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #F4F5F7;">
              <tr><td style="padding: 6px 0; color: #98A2B3; width: 35%;">IP Address:</td><td style="font-weight: bold;">${ipAddress}</td></tr>
              <tr><td style="padding: 6px 0; color: #98A2B3;">Browser / client:</td><td style="font-weight: bold;">${browser}</td></tr>
              <tr><td style="padding: 6px 0; color: #98A2B3;">Operating System:</td><td style="font-weight: bold;">${os}</td></tr>
              <tr><td style="padding: 6px 0; color: #98A2B3;">Estimated Location:</td><td style="font-weight: bold; color: #FF007A;">${location}</td></tr>
            </table>
          </div>
          <p style="color: #98A2B3; font-size: 14px;">If this was you, no action is needed. If you do not recognize this login, please change your password and end all active streams on your account page immediately.</p>
        </div>
      </div>
    `;

    await this.sendMail({
      to: email,
      subject,
      text,
      html: htmlContent,
    });
  }

  private async sendMail(options: { to: string; subject: string; text: string; html: string }): Promise<void> {
    if (env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'AgFlix <onboarding@resend.dev>',
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Resend API returned status ${response.status}: ${errText}`);
        }

        logger.info(`Email successfully dispatched to ${options.to} (Resend HTTP)`);
        return;
      } catch (err) {
        logger.error(`Failed to dispatch email to ${options.to} over Resend HTTP:`, err);
        logger.info(`[RESEND FALLBACK PRINT] Content: ${options.text}`);
      }
    }

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: env.EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        logger.info(`Email successfully dispatched to ${options.to} (SMTP)`);
      } catch (err) {
        logger.error(`Failed to dispatch email to ${options.to} over SMTP:`, err);
        logger.info(`[SMTP FALLBACK PRINT] Content: ${options.text}`);
      }
    } else {
      // Local development print log
      logger.info(`
=========================================
[DEV MAIL FALLBACK]
To: ${options.to}
Subject: ${options.subject}
Body: ${options.text}
=========================================
      `);
    }
  }
}
export default MailService;
