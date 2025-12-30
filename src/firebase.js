import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, collection } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Allow overriding Firebase config via environment variables (preferred),
// fallback to bundled demo config for local development.
const env = import.meta?.env || {};
const envProjectId = env.VITE_FIREBASE_PROJECT_ID || '';
const defaultProjectId = 'fire-extinguisher-tracke-9e98f';

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyB1e9aheHRCYCQF8iNH9C3D1tZlSkYXAlY",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "fire-extinguisher-tracke-9e98f.firebaseapp.com",
  projectId: envProjectId || defaultProjectId,
  // Firebase Storage bucket must be <project-id>.appspot.com
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId || defaultProjectId}.appspot.com`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1068945798281",
  appId: env.VITE_FIREBASE_APP_ID || "1:1068945798281:web:575102ab9851df0d870258",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-0M2WJ03MF0"
};

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
