import { Resend } from 'resend';

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface SendConfirmationEmailParams {
  to: string;
}

export async function sendConfirmationEmail({ to }: SendConfirmationEmailParams) {
  const { data, error } = await getResendClient().emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Orbit <onboarding@resend.dev>',
    to,
    subject: 'Welcome to Orbit!',
    html: getConfirmationEmailHtml(),
  });

  if (error) {
    console.error('Failed to send confirmation email:', error);
    throw new Error(`Failed to send confirmation email: ${error.message}`);
  }

  return data;
}

function getConfirmationEmailHtml(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Orbit</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #111111; border-radius: 12px; border: 1px solid #222222;">
          <tr>
            <td style="padding: 48px 40px;">
              <!-- Logo/Header -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      Orbit
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Main Content -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                      You're on the list!
                    </h2>
                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a1a1a1;">
                      Thanks for signing up. We'll keep you updated on our progress and let you know when we launch.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 24px 0;">
                    <div style="height: 1px; background-color: #222222;"></div>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 14px; color: #666666;">
                      Stay tuned for updates.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
