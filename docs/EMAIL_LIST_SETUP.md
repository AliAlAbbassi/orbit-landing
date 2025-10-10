# Email List Setup Guide

## Prerequisites

1. Google Cloud Platform account with Firebase/Firestore enabled
2. Firebase project created

## Setup Instructions

### 1. Firebase/Firestore Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select or create your project
3. Enable Firestore Database:
   - Navigate to "Firestore Database" in the left sidebar
   - Click "Create database"
   - Choose production mode
   - Select your region

### 2. Generate Service Account Key

1. In Firebase Console, go to Project Settings (gear icon)
2. Navigate to "Service Accounts" tab
3. Click "Generate new private key"
4. Save the downloaded JSON file securely

### 3. Environment Configuration

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Update `.env.local` with your Firebase credentials:
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `FIREBASE_SERVICE_ACCOUNT_KEY`: The entire service account JSON as a single line string

   To convert the service account JSON to a single line:
   ```javascript
   // In Node.js or browser console:
   const serviceAccount = /* paste your JSON here */;
   console.log(JSON.stringify(serviceAccount));
   ```

### 4. Firestore Security Rules

Add these security rules in Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Email subscribers collection - write-only from authenticated admin
    match /email_subscribers/{document=**} {
      allow read: if false;
      allow write: if false; // API handles writes with service account
    }
  }
}
```

### 5. Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The email signup form is now available as a component that can be imported and used anywhere in your application.

3. Monitor subscriptions in Firebase Console > Firestore Database > email_subscribers collection

## Data Structure

Each email subscription is stored with:
- `email`: Subscriber's email (lowercase)
- `source`: Where the subscription came from (default: 'website')
- `subscribedAt`: ISO timestamp of subscription
- `status`: Subscription status ('active', 'unsubscribed', etc.)
- `ipAddress`: Subscriber's IP (for compliance/security)
- `userAgent`: Browser user agent

## Usage in Components

```tsx
import { EmailSignupForm } from '@/components/email-signup-form';

export default function HomePage() {
  return (
    <div>
      <h1>Subscribe to our newsletter</h1>
      <EmailSignupForm />
    </div>
  );
}
```

## Email Export

To export emails from Firestore:

1. Use Firebase Console to export data
2. Or use the Firebase Admin SDK to query and export programmatically
3. Consider implementing an admin API endpoint with proper authentication

## GDPR Compliance Notes

- Store explicit consent timestamp
- Implement unsubscribe functionality
- Add privacy policy link near signup form
- Consider double opt-in email verification
- Implement data deletion requests handling