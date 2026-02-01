import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, collection } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Environment-based Firebase configuration
// Supports: development, staging, production
// Set via .env files or VITE_ENV environment variable
const env = import.meta?.env || {};
const currentEnv = env.VITE_ENV || 'development';

// Default production config (fallback)
// Updated for extinguisher-tracker-2 (SaaS paid version)
const defaultProjectId = 'extinguisher-tracker-2';
const defaultConfig = {
  apiKey: "AIzaSyCnU2KuYWaI3mnlZ-aalyM-IrKTvb3ePfE",
  authDomain: "extinguisher-tracker-2.firebaseapp.com",
  projectId: defaultProjectId,
  storageBucket: "extinguisher-tracker-2.firebasestorage.app",
  messagingSenderId: "190749542107",
  appId: "1:190749542107:web:14ffb776339ffba965eefe",
  measurementId: "" // Add when Analytics is set up
};

// Build config from environment variables or use defaults
const envProjectId = env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: envProjectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || defaultConfig.measurementId
};

// Log environment in development (helpful for debugging)
if (currentEnv === 'development' && import.meta.env.DEV) {
  console.log(`🔥 Firebase initialized for: ${currentEnv}`);
  console.log(`📦 Project ID: ${firebaseConfig.projectId}`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence (queues writes, serves cached reads)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    // Ignore known cases (multiple tabs) but log others for visibility
    if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
      console.warn('Firestore persistence error:', err);
    }
  });
} catch (e) {
  console.warn('Failed to enable Firestore persistence:', e);
}
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// Collection references
export const workspacesRef = collection(db, 'workspaces');

export default app;
