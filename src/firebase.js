import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "auto-hub-2026-unique",
  appId: "1:429889901485:web:97f32355b0b4266a230724",
  storageBucket: "auto-hub-2026-unique.firebasestorage.app",
  apiKey: "AIzaSyBY9dBd-CYRKgInTDx4QxZFg6DDPjhJOOQ",
  authDomain: "auto-hub-2026-unique.firebaseapp.com",
  messagingSenderId: "429889901485",
  projectNumber: "429889901485"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
