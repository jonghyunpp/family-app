import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDO-qf5z2eLxdBV_sNyYvUNVBho_OqK_98",
  authDomain: "family-app-11e73.firebaseapp.com",
  projectId: "family-app-11e73",
  storageBucket: "family-app-11e73.firebasestorage.app",
  messagingSenderId: "114328914495",
  appId: "1:114328914495:web:e6c9898d5433a36623c68a",
};

// ✅ 두 사람의 Google 이메일 주소를 여기에 입력하세요
export const ALLOWED_EMAILS = [
  "pjhbse@gmail.com",   // 종현 (Firebase 프로젝트 소유자 이메일)
  "hn5620@gmail.com",   // 성은
];

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
