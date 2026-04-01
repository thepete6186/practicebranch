import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeFirestore } from 'firebase/firestore';

/**
 * Single Firebase web app used by this CRA bundle. All Firestore reads/writes use `db` from this file
 * (see `src/services/pdFirestore.js`). The object below is the Firebase client config (apiKey, etc.).
 */
const firebaseConfig = {
  apiKey: 'AIzaSyC3P5qPTqDmsdlpcMVXE_arOXxbytwRxTA',
  authDomain: 'pdapp-1e5a3.firebaseapp.com',
  projectId: 'pdapp-1e5a3',
  storageBucket: 'pdapp-1e5a3.firebasestorage.app',
  messagingSenderId: '805337718391',
  appId: '1:805337718391:web:e2bdaaeb66b3d12ffaf072',
  measurementId: 'G-H0WKQQ9Z1J',
};

export const firebaseProjectId = firebaseConfig.projectId;

export const firebaseApp = initializeApp(firebaseConfig);
// Improves reliability when the default WebChannel transport drops updates (empty snapshots after refresh).
export const db = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true,
});

isSupported()
  .then((yes) => {
    if (yes) getAnalytics(firebaseApp);
  })
  .catch(() => {});