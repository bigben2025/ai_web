import twilio from 'twilio';

export async function sendWelcomeSMS(toPhone: string, name: string | null): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) return; // silently skip if not configured

  const client = twilio(accountSid, authToken);

  const greeting = name ? `Hi ${name.split(' ')[0]}` : 'Hi there';

  await client.messages.create({
    to: toPhone,
    from: fromPhone,
    body: `${greeting}! 👋 Thank you for reaching out to Concierge Care Florida.

We offer award-winning home care across Florida:
• 24-Hour Care
• Alzheimer's & Dementia Care
• Companion & Personal Care
• Respite & Transitional Care

A care coordinator will follow up with you shortly. Need immediate help? Call us anytime: 888-205-9940

Learn more: https://conciergecarefl.com`,
  });
}
