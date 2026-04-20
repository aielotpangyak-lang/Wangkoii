import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with long polling to ensure connectivity in sandboxed environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence setup failed:", error);
});

export const storage = getStorage(app);

// Connectivity Test Connection Connection
async function testConnection() {
  try {
    // Try to reach the server directly to bypass local cache
    // Using 'settings/status' because it's allowed for public read in firestore.rules
    await getDocFromServer(doc(db, 'settings', 'status'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration or network status. The client is currently offline.");
      } else if (error.message.includes('permission')) {
        console.warn("Firestore connection test: Permissions denied, but connection might still be active. Check rules.");
      } else {
        console.error("Firestore connectivity test failed:", error);
      }
    }
  }
}

testConnection();
