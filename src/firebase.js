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
const defaultProjectId = 'fire-extinguisher-tracke-9e98f';
const defaultConfig = {
  apiKey: "AIzaSyB1e9aheHRCYCQF8iNH9C3D1tZlSkYXAlY",
  authDomain: "fire-extinguisher-tracke-9e98f.firebaseapp.com",
  projectId: defaultProjectId,
  storageBucket: `${defaultProjectId}.appspot.com`,
  messagingSenderId: "1068945798281",
  appId: "1:1068945798281:web:575102ab9851df0d870258",
  measurementId: "G-0M2WJ03MF0"
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
