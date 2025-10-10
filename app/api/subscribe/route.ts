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

  if (!serviceAccount) {
    console.error('Firebase service account not found in environment variables');
    throw new Error('Firebase configuration missing');
  }

  if (!process.env.FIREBASE_PROJECT_ID) {
    console.error('Firebase project ID not found in environment variables');
    throw new Error('Firebase project ID missing');
  }

  console.log('Initializing Firebase with project ID:', process.env.FIREBASE_PROJECT_ID);

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

export async function POST(request: Request) {
  try {
    console.log('API endpoint called');
    const body = await request.json();
    console.log('Request body received:', { email: body.email, source: body.source });

    const validatedData = emailSchema.parse(body);
    console.log('Data validated successfully');

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

    console.log('Checking for existing subscriber...');
    const existingSubscriber = await db
      .collection('email_subscribers')
      .where('email', '==', subscriberData.email)
      .limit(1)
      .get();

    if (!existingSubscriber.empty) {
      console.log('Email already exists:', subscriberData.email);
      return NextResponse.json(
        { message: 'Email already subscribed' },
        { status: 409 }
      );
    }

    console.log('Adding new subscriber to Firestore...');
    const docRef = await db.collection('email_subscribers').add(subscriberData);
    console.log('Successfully added subscriber with ID:', docRef.id);

    return NextResponse.json(
      { message: 'Successfully subscribed!', email: subscriberData.email },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues);
      return NextResponse.json(
        { message: 'Invalid email format', errors: error.issues },
        { status: 400 }
      );
    }

    console.error('Subscription error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });

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