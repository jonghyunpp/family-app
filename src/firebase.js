import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDO-qf5z2eLxdBV_sNyYvUNVBho_OqK_98",
  authDomain: "family-app-11e73.firebaseapp.com",
  projectId: "family-app-11e73",
  storageBucket: "family-app-11e73.firebasestorage.app",
  messagingSenderId: "114328914495",
  appId: "1:114328914495:web:e6c9898d5433a36623c68a",
};

// 두 사람 계정
export const USERS = {
  종현: "jonghyun@woori.app",
  성은: "sungeun@woori.app",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
