import { APP_NAME } from "../constants";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ResendEmailResponse {
  id: string;
}

export class ResendClient {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail?: string) {
    if (!apiKey) {
      throw new Error("Resend API key is required");
    }
    this.apiKey = apiKey;
    this.fromEmail =
      fromEmail ||
      process.env.RESEND_FROM_EMAIL ||
      "onboarding@resend.dev";
  }

  async sendEmail(options: SendEmailOptions): Promise<ResendEmailResponse> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}

export function createResendClient(): ResendClient {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new ResendClient(apiKey);
}

// --- Email Templates ---

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #f5e6d3; background-color: #1a1614; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2a2220 0%, #1a1614 100%); border: 1px solid #3d3330; border-radius: 12px; overflow: hidden;">
    <div style="background: #d4a574; padding: 24px 30px; text-align: center;">
      <h1 style="color: #1a1614; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">${APP_NAME}</h1>
    </div>
    <div style="padding: 30px;">
      ${content}
    </div>
    <div style="padding: 16px 30px; border-top: 1px solid #3d3330; text-align: center;">
      <p style="font-size: 12px; color: #8a7a6d; margin: 0;">Sent by ${APP_NAME}</p>
    </div>
  </div>
</body>
</html>
`.trim();

export function generateMeetupCreatedEmail(params: {
  creatorName: string;
  meetupTitle: string;
  shareUrl: string;
}): { html: string; text: string } {
  const html = emailWrapper(`
    <p style="font-size: 16px; margin: 0 0 12px;">Hey ${params.creatorName},</p>
    <p style="font-size: 16px; margin: 0 0 20px;">Your coffee meetup <strong>"${params.meetupTitle}"</strong> is live! Share the link below to get people to RSVP.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.shareUrl}" style="display: inline-block; background: #d4a574; color: #1a1614; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View your meetup</a>
    </div>
    <p style="font-size: 14px; color: #8a7a6d; margin: 16px 0 0;">Or copy this link: <a href="${params.shareUrl}" style="color: #d4a574;">${params.shareUrl}</a></p>
  `);

  const text = `Hey ${params.creatorName},\n\nYour coffee meetup "${params.meetupTitle}" is live!\n\nShare this link: ${params.shareUrl}\n\n- ${APP_NAME}`;

  return { html, text };
}

export function generateRsvpNotificationEmail(params: {
  creatorName: string;
  rsvpName: string;
  meetupTitle: string;
  shareUrl: string;
}): { html: string; text: string } {
  const html = emailWrapper(`
    <p style="font-size: 16px; margin: 0 0 12px;">Hey ${params.creatorName},</p>
    <p style="font-size: 16px; margin: 0 0 20px;"><strong>${params.rsvpName}</strong> just RSVP'd to <strong>"${params.meetupTitle}"</strong>!</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.shareUrl}" style="display: inline-block; background: #d4a574; color: #1a1614; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View meetup</a>
    </div>
  `);

  const text = `Hey ${params.creatorName},\n\n${params.rsvpName} just RSVP'd to "${params.meetupTitle}"!\n\nView meetup: ${params.shareUrl}\n\n- ${APP_NAME}`;

  return { html, text };
}

export function generateSpotPickedEmail(params: {
  recipientName: string;
  creatorName: string;
  meetupTitle: string;
  coffeeName: string;
  coffeeAddress: string;
  mapsUrl: string;
  shareUrl: string;
}): { html: string; text: string } {
  const html = emailWrapper(`
    <p style="font-size: 16px; margin: 0 0 12px;">Hey ${params.recipientName},</p>
    <p style="font-size: 16px; margin: 0 0 20px;">${params.creatorName} picked a spot for <strong>"${params.meetupTitle}"</strong>!</p>
    <div style="background: #2a2220; border: 1px solid #3d3330; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 8px; color: #d4a574; font-size: 18px;">${params.coffeeName}</h3>
      <p style="margin: 0; color: #8a7a6d; font-size: 14px;">${params.coffeeAddress}</p>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.mapsUrl}" style="display: inline-block; background: #d4a574; color: #1a1614; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Get directions</a>
    </div>
    <p style="font-size: 14px; color: #8a7a6d; text-align: center; margin: 16px 0 0;">
      <a href="${params.shareUrl}" style="color: #d4a574;">View meetup details</a>
    </p>
  `);

  const text = `Hey ${params.recipientName},\n\n${params.creatorName} picked a spot for "${params.meetupTitle}"!\n\n${params.coffeeName}\n${params.coffeeAddress}\n\nGet directions: ${params.mapsUrl}\n\n- ${APP_NAME}`;

  return { html, text };
}
