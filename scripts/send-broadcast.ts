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

interface Subscriber {
  email: string;
  status: string;
}

async function getSubscribers(): Promise<Subscriber[]> {
  const snapshot = await db
    .collection('email_subscribers')
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.map(doc => doc.data() as Subscriber);
}

async function sendBroadcast(subject: string, htmlContent: string) {
  const subscribers = await getSubscribers();

  console.log(`\n📧 Found ${subscribers.length} active subscribers\n`);

  if (subscribers.length === 0) {
    console.log('No subscribers to send to.');
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Orbit <onboarding@resend.dev>',
        to: subscriber.email,
        subject,
        html: htmlContent,
      });
      sent++;
      console.log(`✅ Sent to ${subscriber.email}`);
    } catch (error) {
      failed++;
      console.error(`❌ Failed to send to ${subscriber.email}:`, error);
    }

    // Rate limiting - Resend free tier is 100 emails/day, 1 email/second
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  console.log(`\n📊 Results: ${sent} sent, ${failed} failed`);
}

function getEmailTemplate(title: string, body: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hoopaudio.com';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
                      ${title}
                    </h2>
                    <div style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a1a1a1; text-align: left;">
                      ${body}
                    </div>
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
                      You're receiving this because you signed up for Orbit updates.
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

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🚀 Orbit Broadcast Email Tool\n');

  const subject = await prompt('Email subject: ');
  const title = await prompt('Email title (header in email): ');
  console.log('Email body (HTML supported, press Enter twice to finish):');

  const bodyLines: string[] = [];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  for await (const line of rl) {
    if (line === '' && bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === '') {
      break;
    }
    bodyLines.push(line);
  }

  const body = bodyLines.slice(0, -1).join('<br>');
  const html = getEmailTemplate(title, body);

  const subscribers = await getSubscribers();
  console.log(`\n📋 Preview:`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Title: ${title}`);
  console.log(`   Recipients: ${subscribers.length} subscribers\n`);

  const confirm = await prompt('Send this broadcast? (yes/no): ');

  if (confirm.toLowerCase() === 'yes') {
    await sendBroadcast(subject, html);
  } else {
    console.log('❌ Broadcast cancelled');
  }

  process.exit(0);
}

main().catch(console.error);
