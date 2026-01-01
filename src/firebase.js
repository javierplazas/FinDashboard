import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAb25fHoIi1W4lrINIXO3rm33RaEtdb5cE",
    authDomain: "personal-findashboard.firebaseapp.com",
    projectId: "personal-findashboard",
    storageBucket: "personal-findashboard.firebasestorage.app",
    messagingSenderId: "807136929630",
    appId: "1:807136929630:web:a8529126451ab00111d1cf",
    measurementId: "G-WKBJE16BC0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
