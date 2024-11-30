// lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCzpk6_vpfxsN-m65TQ_ih9WXHPdY7qPEQ",
  authDomain: "testing-c4218.firebaseapp.com",
  databaseURL: "https://testing-c4218-default-rtdb.firebaseio.com",
  projectId: "testing-c4218",
  storageBucket: "testing-c4218.appspot.com",
  messagingSenderId: "878217383934",
  appId: "1:878217383934:web:9836402dbdc6032ba6faaf",
  measurementId: "G-TWCT2CDZK4"
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database };
