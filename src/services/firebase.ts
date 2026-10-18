import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

export const firebaseEnabled = Boolean(firebaseConfig && firebaseConfig.apiKey);

let db: Firestore | null = null;
let auth: Auth | null = null;

if (firebaseEnabled && firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);
  auth = getAuth(app);
}

export { db, auth };
