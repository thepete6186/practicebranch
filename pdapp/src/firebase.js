// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC3P5qPTqDmsdlpcMVXE_arOXxbytwRxTA",
  authDomain: "pdapp-1e5a3.firebaseapp.com",
  projectId: "pdapp-1e5a3",
  storageBucket: "pdapp-1e5a3.firebasestorage.app",
  messagingSenderId: "805337718391",
  appId: "1:805337718391:web:e2bdaaeb66b3d12ffaf072",
  measurementId: "G-H0WKQQ9Z1J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);