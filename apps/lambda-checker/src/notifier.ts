import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { config } from "./config";

const sesClient = new SESClient({
  region: config.region,
  ...(process.env.AWS_ACCESS_KEY_ID
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mockKey",
        },
      }
    : {}),
});

export interface DownAlertPayload {
  monitorName: string;
  url: string;
  cause: string;
  timestamp: string;
  recipientEmail: string;
}

export interface RecoveryAlertPayload {
  monitorName: string;
  url: string;
  startedAt: string;
  resolvedAt: string;
  durationSeconds: number;
  recipientEmail: string;
}

export class Notifier {
  /**
   * Sends an incident alert email via AWS SES when a monitor reaches 3 consecutive failures.
   */
  async sendDownAlert(payload: DownAlertPayload): Promise<boolean> {
    const subject = `🚨 [DOWN] ${payload.monitorName} is DOWN`;
    const textBody = `
Monitor Alert: ${payload.monitorName} is DOWN
--------------------------------------------------
URL: ${payload.url}
Trigger: 3 consecutive check failures
Time: ${payload.timestamp}
Cause: ${payload.cause}

Please check your service health immediately.
PingBoard Monitoring
`.trim();

    const htmlBody = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
  <div style="background-color: #ef4444; color: white; padding: 12px 16px; border-radius: 6px; font-weight: bold; font-size: 18px;">
    🚨 Monitor Alert: ${payload.monitorName} is DOWN
  </div>
  <div style="padding: 16px 0;">
    <p>Your monitor has failed <strong>3 consecutive health checks</strong> and is marked as <strong>DOWN</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 120px;"><strong>URL</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;"><a href="${payload.url}" style="color: #2563eb;">${payload.url}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; color: #6b7280;"><strong>Timestamp</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${payload.timestamp}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; color: #6b7280;"><strong>Failure Cause</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; color: #dc2626; font-family: monospace;">${payload.cause}</td>
      </tr>
    </table>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
  <p style="font-size: 12px; color: #9ca3af; text-align: center;">Sent automatically by PingBoard Uptime Monitoring</p>
</div>
`.trim();

    return this.sendEmail(payload.recipientEmail, subject, textBody, htmlBody);
  }

  /**
   * Sends a recovery notification email via AWS SES when a monitor returns to UP.
   */
  async sendRecoveryAlert(payload: RecoveryAlertPayload): Promise<boolean> {
    const minutes = Math.floor(payload.durationSeconds / 60);
    const seconds = payload.durationSeconds % 60;
    const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const subject = `✅ [RESOLVED] ${payload.monitorName} is back UP`;
    const textBody = `
Monitor Recovery: ${payload.monitorName} is back UP
--------------------------------------------------
URL: ${payload.url}
Downtime Duration: ${durationText}
Started At: ${payload.startedAt}
Resolved At: ${payload.resolvedAt}

Service has returned to normal operations.
PingBoard Monitoring
`.trim();

    const htmlBody = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
  <div style="background-color: #10b981; color: white; padding: 12px 16px; border-radius: 6px; font-weight: bold; font-size: 18px;">
    ✅ Monitor Recovery: ${payload.monitorName} is back UP
  </div>
  <div style="padding: 16px 0;">
    <p>Good news! Your service has passed health checks and is now <strong>OPERATIONAL</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 140px;"><strong>URL</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;"><a href="${payload.url}" style="color: #2563eb;">${payload.url}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; color: #6b7280;"><strong>Total Downtime</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #047857;">${durationText}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; color: #6b7280;"><strong>Downtime Window</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${payload.startedAt} to ${payload.resolvedAt}</td>
      </tr>
    </table>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
  <p style="font-size: 12px; color: #9ca3af; text-align: center;">Sent automatically by PingBoard Uptime Monitoring</p>
</div>
`.trim();

    return this.sendEmail(payload.recipientEmail, subject, textBody, htmlBody);
  }

  private async sendEmail(
    toAddress: string,
    subject: string,
    textBody: string,
    htmlBody: string
  ): Promise<boolean> {
    if (!config.sesEnabled) {
      console.log(
        JSON.stringify({
          level: "INFO",
          message: "SES is disabled. Alert email simulated.",
          to: toAddress,
          subject,
        })
      );
      return true;
    }

    try {
      const command = new SendEmailCommand({
        Source: config.sesSenderEmail,
        Destination: {
          ToAddresses: [toAddress],
        },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: textBody, Charset: "UTF-8" },
            Html: { Data: htmlBody, Charset: "UTF-8" },
          },
        },
      });

      await sesClient.send(command);
      console.log(
        JSON.stringify({
          level: "INFO",
          message: "SES alert email sent successfully",
          to: toAddress,
          subject,
        })
      );
      return true;
    } catch (err: any) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          message: "Failed to send SES email alert",
          to: toAddress,
          error: err.message,
        })
      );
      return false;
    }
  }
}

export const notifier = new Notifier();
