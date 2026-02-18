const smsService = {
  /**
   * Send SMS via Twilio
   */
  async send({ to, body }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('SMS service not configured (Twilio credentials missing)');
      return { success: false, error: 'SMS service not configured' };
    }

    // Use fetch to call Twilio REST API directly (no SDK dependency)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: body,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'SMS send failed');
    }

    return { success: true, sid: result.sid };
  },
};

export default smsService;
