import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
  source: z.string().optional(),
  timestamp: z.string().optional(),
});

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
}

const db = getFirestore();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validatedData = emailSchema.parse(body);

    const subscriberData = {
      email: validatedData.email.toLowerCase(),
      source: validatedData.source || 'website',
      subscribedAt: new Date().toISOString(),
      status: 'active',
      ipAddress: request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    const existingSubscriber = await db
      .collection('email_subscribers')
      .where('email', '==', subscriberData.email)
      .limit(1)
      .get();

    if (!existingSubscriber.empty) {
      return NextResponse.json(
        { message: 'Email already subscribed' },
        { status: 409 }
      );
    }

    await db.collection('email_subscribers').add(subscriberData);

    return NextResponse.json(
      { message: 'Successfully subscribed!', email: subscriberData.email },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid email format', errors: error.issues },
        { status: 400 }
      );
    }

    console.error('Subscription error:', error);
    return NextResponse.json(
      { message: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  );
}