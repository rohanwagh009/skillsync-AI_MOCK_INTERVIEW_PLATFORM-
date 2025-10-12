// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp  } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDhYGSMNTpMEX_hEnezXF4194fGLAfv9u4",
  authDomain: "skillsync-a8583.firebaseapp.com",
  projectId: "skillsync-a8583",
  storageBucket: "skillsync-a8583.firebasestorage.app",
  messagingSenderId: "834283634011",
  appId: "1:834283634011:web:61c89268e0554b1e776e7e",
  measurementId: "G-RLMFS36P0N",
};

// Initialize Firebase
const app =!getApps.length ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app);
export const db = getFirestore(app);
