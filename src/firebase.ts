import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const getFirebaseValue = (envVal: string | undefined, fallback: string) => {
  if (!envVal || envVal.trim() === "" || envVal.includes("your-")) {
    return fallback;
  }
  return envVal;
};

const firebaseConfig = {
  apiKey: getFirebaseValue(process.env.EXPO_PUBLIC_FIREBASE_API_KEY, "AIzaSyAkDD-vGiNUrafI2PfwNu8EK3Wy5fEzBF4"),
  authDomain: getFirebaseValue(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, "branddocs-b8909.firebaseapp.com"),
  projectId: getFirebaseValue(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, "branddocs-b8909"),
  storageBucket: getFirebaseValue(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, "branddocs-b8909.firebasestorage.app"),
  messagingSenderId: getFirebaseValue(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, "258949594571"),
  appId: getFirebaseValue(process.env.EXPO_PUBLIC_FIREBASE_APP_ID, "1:258949594571:web:f3446a55cfc5a09c904a4e"),
  measurementId: getFirebaseValue(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID, "G-EMWZKLGZNC"),
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 