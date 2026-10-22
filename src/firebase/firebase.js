import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBR-HME7XbUd2QKosF-ff_BwmI7Q7zFvUY",
    authDomain: "wastmanagement-68d59.firebaseapp.com",
    projectId: "wastmanagement-68d59",
    storageBucket: "wastmanagement-68d59.firebasestorage.app",
    messagingSenderId: "933927108944",
    appId: "1:933927108944:web:07362f56f90a03561eec55",
    measurementId: "G-PE0TNV9MTM"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);