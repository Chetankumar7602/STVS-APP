import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Sends an SMS message using Twilio
 * @param {string} to - Recipient phone number
 * @param {string} body - Message content
 */
export async function sendSMS(to, body) {
  if (!accountSid || !authToken || !fromPhone) {
    console.warn('Twilio credentials not configured. SMS not sent.');
    console.log(`[MOCK SMS] To: ${to} | Body: ${body}`);
    return;
  }

  try {
    const message = await client.messages.create({
      body,
      from: fromPhone,
      to,
    });
    return message;
  } catch (error) {
    console.error('Twilio SMS Error:', error);
    throw error;
  }
}

/**
 * Send a thank you SMS to a donor
 */
export async function sendThankYouSMS(donation) {
  const message = `Namaste ${donation.name}, thank you for your generous contribution of INR ${donation.amount} to STVS Trust. Your support helps us empower more students. - STVS Team`;
  return await sendSMS(donation.phone, message);
}

/**
 * Send a confirmation SMS to a volunteer
 */
export async function sendVolunteerConfirmation(volunteer) {
  const message = `Namaste ${volunteer.name}, thank you for joining STVS Trust as a volunteer! We have received your application and will get in touch shortly. - STVS Team`;
  return await sendSMS(volunteer.phone, message);
}
