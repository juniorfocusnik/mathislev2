// ============================================================
// FIREBASE PROJECT CONFIG
// ============================================================
// TODO: replace every value below with your real Firebase project config.
// Get it from: Firebase Console -> (your project) -> Project settings (gear
// icon) -> General tab -> "Your apps" -> the web app (</>) -> SDK setup and
// configuration -> "Config".
//
// Before this will work at all, in the Firebase Console you also need to:
//   1. Create a project (or use an existing one).
//   2. Build > Authentication > Get started > Sign-in method > enable
//      "Email/Password".
//   3. Build > Firestore Database > Create database (start in production
//      mode is fine — see the security rules note in scripts/auth.js).
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAu9DXnrtxdZXnbdK6XcV65rzAhYz7vgfk",
  authDomain: "mathisle-v2.firebaseapp.com",
  projectId: "mathisle-v2",
  storageBucket: "mathisle-v2.firebasestorage.app",
  messagingSenderId: "1051363531461",
  appId: "1:1051363531461:web:70d397de34d7490bb16eac"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// A second, separately-named app instance pointed at the SAME project.
// Creating a Firebase Auth user via createUserWithEmailAndPassword normally
// signs the browser in as that new user — fine for a real signup page, but
// disastrous for an admin creating an account for someone else, since it
// would silently sign the admin out of their own session. Running the create
// call against this isolated instance keeps the admin's real `auth` session
// (above) completely untouched.
const adminCreateApp = initializeApp(firebaseConfig, 'AdminCreateAccount');
const adminCreateAuth = getAuth(adminCreateApp);

export { auth, db, adminCreateAuth };
