// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBrVEixdCkEzve2pbVVAWT8TbaWr0NUeoo",
  authDomain: "gestionlinktextil.firebaseapp.com",
  projectId: "gestionlinktextil",
  storageBucket: "gestionlinktextil.firebasestorage.app",
  messagingSenderId: "384978844641",
  appId: "1:384978844641:web:9c92abb22b05d4eb8bb0a0",
  //measurementId: "G-8ESNLLSQR7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };