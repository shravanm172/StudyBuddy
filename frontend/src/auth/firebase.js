import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQPxETsXYLyK0qCMOMx9_NW4Xhjz0PMI0",
  authDomain: "studybuddy-5a6b8.firebaseapp.com",
  projectId: "studybuddy-5a6b8",
  storageBucket: "studybuddy-5a6b8.firebasestorage.app",
  messagingSenderId: "88179998693",
  appId: "1:88179998693:web:e66d32c63b1a12ed054e2c",
  measurementId: "G-1XR2F7TWXE",
};

const app = initializeApp(firebaseConfig);
console.log("ENV loaded?", {
  hasKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  project: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;