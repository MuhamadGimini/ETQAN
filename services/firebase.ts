
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';
import type { FirebaseConfig } from '../types';

let db: any = null;
let connectionListenerUnsubscribe: (() => void) | null = null;

// Helper to construct database path
const getPath = (dbId: string, key: string) => {
    // If dbId is empty, null or undefined, treat as root.
    if (!dbId || dbId.trim() === '') return key;
    return `${dbId}/${key}`;
};

export const initFirebase = (config: FirebaseConfig, onConnectionStatusChange: (isConnected: boolean) => void) => {
  try {
    if (connectionListenerUnsubscribe) {
      connectionListenerUnsubscribe();
      connectionListenerUnsubscribe = null;
    }

    const sanitizedConfig = { ...config };
    
    // Robust databaseURL sanitization
    if (sanitizedConfig.databaseURL) {
        let url = sanitizedConfig.databaseURL.trim();
        
        // Ensure protocol
        if (!url.match(/^https?:\/\//)) {
            url = `https://${url}`;
        }
        
        // Remove trailing slashes
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }

        try {
            const urlObj = new URL(url);
            // Ensure it's just the origin (protocol + hostname) or full path if needed
            // For Firebase RTDB, it's usually https://<project>.firebaseio.com
            sanitizedConfig.databaseURL = urlObj.origin; 
        } catch (e) {
            console.warn("Could not parse databaseURL, using sanitized string:", url);
            sanitizedConfig.databaseURL = url;
        }
    }

    const app = getApps().length === 0 ? initializeApp(sanitizedConfig) : getApp();
    db = getDatabase(app);

    const connectedRef = ref(db, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snap) => {
      const isConnected = snap.val() === true;
      console.log(`[Firebase] Connection status: ${isConnected ? '✅ Connected' : '❌ Disconnected'}`);
      onConnectionStatusChange(isConnected);
    });
    
    connectionListenerUnsubscribe = unsubscribe;

    return true;
  } catch (error) {
    console.error("❌ Firebase Initialization Error:", error);
    onConnectionStatusChange(false);
    return false;
  }
};


export const writeToDb = (dbId: string, key: string, data: any) => {
  if (!db) return;
  // Note: dbId CAN be empty string now (for root access), so we only check key
  if (!key) {
      console.warn("Firebase Write SKIPPED: Missing key", { dbId, key });
      return;
  }
  
  const path = getPath(dbId, key);
  console.log(`🔥 [Firebase SYNC] Attempting WRITE to: ${path}`);
  
  const dbRef = ref(db, path);
  set(dbRef, data)
    .then(() => console.log(`✅ [Firebase SYNC] Data successfully WRITTEN to: ${path}`))
    .catch(err => {
      console.error("❌ Firebase Write Error:", err);
      if ((err as any).code === 'PERMISSION_DENIED') {
          alert(
              'خطأ في المزامنة السحابية: تم رفض الإذن (PERMISSION_DENIED).\n\n' +
              'تأكد من قواعد قاعدة البيانات (Rules) في Firebase.'
          );
      }
  });
};

export const subscribeToDb = (dbId: string, key: string, callback: (data: any) => void) => {
  if (!db) {
      console.warn("Firebase DB not initialized, skipping subscription");
      return () => {};
  }
  if (!key) {
      console.warn("Skipping subscription: Missing key", { dbId, key });
      return () => {};
  }

  const path = getPath(dbId, key);
  console.log(`👂 [Firebase SYNC] Subscribing to: ${path}`);
  
  const dbRef = ref(db, path);
  
  const unsubscribe = onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    const status = data === null ? 'NULL (Empty)' : 'Data Found';
    console.log(`📥 [Firebase SYNC] Data RECEIVED for ${path}: ${status}`);
    callback(data);
  }, (error) => {
    console.error(`❌ [Firebase SYNC] Subscription error for ${path}:`, error);
  });

  return () => {
      console.log(`👋 [Firebase SYNC] Unsubscribing from: ${path}`);
      off(dbRef);
  };
};
