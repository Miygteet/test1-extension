// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDAIY4mQah0iKGbMvzm39iwBXb_CAvi3Fc",
    authDomain: "family-website-manager.firebaseapp.com",
    projectId: "family-website-manager",
    storageBucket: "family-website-manager.firebasestorage.app",
    messagingSenderId: "870021557529",
    appId: "1:870021557529:web:753e7457382c91cd972988",
    measurementId: "G-BYJPC2DLP0"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
