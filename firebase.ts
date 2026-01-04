// Fix: Use namespace import to resolve type definition issues with initializeApp
import * as firebaseApp from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Access environment variables with type assertion
const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

// Debug Check
if (!firebaseConfig.apiKey) {
    console.error("❌ Firebase API Key 遺失！\n如果您正在本地開發，請確認 .env 檔案存在。\n如果您在 GitHub Pages，請確認 GitHub Secrets 已設定。");
} else {
    console.log("✅ Firebase Config Loaded");
}

// Initialize Firebase
// Fix: Use casting to any to bypass potential type mismatch for initializeApp
const app = (firebaseApp as any).initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
