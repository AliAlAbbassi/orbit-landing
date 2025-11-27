import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config({ path: '.env.local' });

// Initialize Firebase
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

  if (!serviceAccount) {
    console.error('❌ Firebase service account not found');
    process.exit(1);
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

function getWelcomeEmailHtml(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hoopaudio.com';

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
                    <img src="${siteUrl}/ORBIT-WIREFRAME-LOGO.png" alt="Orbit" width="64" height="64" style="display: block; margin: 0 auto 16px auto;" />
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

async function main() {
  console.log('🚀 Send Welcome Email to All Subscribers\n');

  const snapshot = await db
    .collection('email_subscribers')
    .where('status', '==', 'active')
    .get();

  const subscribers = snapshot.docs.map(doc => doc.data().email as string);

  console.log(`📧 Found ${subscribers.length} active subscribers\n`);

  if (subscribers.length === 0) {
    console.log('No subscribers to send to.');
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const confirm = await new Promise<string>(resolve => {
    rl.question(`Send welcome email to ${subscribers.length} subscribers? (yes/no): `, resolve);
  });
  rl.close();

  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  let sent = 0;
  let failed = 0;
  const html = getWelcomeEmailHtml();

  for (const email of subscribers) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Orbit <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to Orbit!',
        html,
      });
      sent++;
      console.log(`✅ Sent to ${email}`);
    } catch (error) {
      failed++;
      console.error(`❌ Failed: ${email}`, error);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  console.log(`\n📊 Done: ${sent} sent, ${failed} failed`);
  process.exit(0);
}

main().catch(console.error);
