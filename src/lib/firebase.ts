import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC-zZILQ1BHa1IufQ7YbKHYuQiEriUlm0A",
  authDomain: "as-khushboo-os.firebaseapp.com",
  projectId: "as-khushboo-os",
  storageBucket: "as-khushboo-os.firebasestorage.app",
  messagingSenderId: "1048209793662",
  appId: "1:1048209793662:web:bbe45759ba128202132e2f",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export {
  db,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  getDoc,
  serverTimestamp,
};
