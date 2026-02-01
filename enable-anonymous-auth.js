/**
 * Script to enable Anonymous Authentication in Firebase
 * 
 * This requires Firebase Admin SDK to be set up.
 * 
 * To use this script:
 * 1. Install: npm install firebase-admin
 * 2. Set up service account: https://firebase.google.com/docs/admin/setup
 * 3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * 4. Run: node enable-anonymous-auth.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (requires service account)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: 'fire-extinguisher-tracke-9e98f'
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    console.log('\nPlease set up Firebase Admin SDK first.');
    console.log('See: https://firebase.google.com/docs/admin/setup');
    process.exit(1);
  }
}

async function enableAnonymousAuth() {
  try {
    // Note: Firebase Admin SDK doesn't have a direct method to enable auth providers
    // This needs to be done through Firebase Console or Management API
    console.log('Unfortunately, Firebase Admin SDK cannot directly enable authentication providers.');
    console.log('Please enable Anonymous Authentication through the Firebase Console:');
    console.log('1. Go to https://console.firebase.google.com/');
    console.log('2. Select project: fire-extinguisher-tracke-9e98f');
    console.log('3. Go to Authentication > Sign-in method');
    console.log('4. Click on "Anonymous" and enable it');
    console.log('5. Save');
  } catch (error) {
    console.error('Error:', error);
  }
}

enableAnonymousAuth();
