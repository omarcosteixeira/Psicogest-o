import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBrsIJFfWEfMLIADZ4PpWXbnja7EiktJ2w",
  authDomain: "psicogestao-b0923.firebaseapp.com",
  projectId: "psicogestao-b0923",
  storageBucket: "psicogestao-b0923.firebasestorage.app",
  messagingSenderId: "25305214154",
  appId: "1:25305214154:web:8a76fed4907b67ac061833"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code == 'unimplemented') {
    console.warn('Persistence failed: Browser not supported');
  }
});

export default app;
