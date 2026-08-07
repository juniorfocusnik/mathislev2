import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  doc, getDoc, setDoc, collection, getDocs
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// ============================================================
// AUTH + CLOUD SYNC
// ============================================================
// Firebase Auth handles login/logout for the fixed set of pre-created
// classmate accounts (no self-serve signup). Everything the game already
// stores in localStorage (tokens, owned palettes, active theme, boosts) is
// mirrored into a Firestore document per account, so progress follows the
// account instead of the browser.
//
// Rather than rewriting every place in main.js/token-shop.js/game-engine.js
// that reads/writes these localStorage keys, this module patches
// Storage.prototype.setItem so any write to one of the SYNCED_KEYS is
// automatically (and transparently) pushed to Firestore in the background.
// On sign-in, the Firestore document is pulled down into localStorage BEFORE
// the page renders, so the rest of the app just keeps working unchanged.
//
// Firestore security rules needed (Firebase Console -> Firestore Database ->
// Rules) so players can only read/write their own document, but any signed-in
// account can LIST the collection (needed for the admin token dashboard —
// see getAllUserTokens below):
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{uid} {
//         allow get, write: if request.auth != null && request.auth.uid == uid;
//         allow list: if request.auth != null;
//       }
//     }
//   }
//
// NOTE: "allow list" means any logged-in account (i.e. any of the 46
// classmate accounts) could technically query every user's document
// directly through the Firestore SDK, bypassing the admin page's password
// screen entirely — that password only gates the UI, not the data itself.
// There's no real backend here to enforce it server-side. Fine for a class
// token count, but don't rely on it for anything sensitive.
// ============================================================

const SYNCED_KEYS = [
  'tokens', 'ownedPalettes', 'activeTheme',
  'tokenMultiplier', 'extraSeconds', 'streakInterval',
  'powerup_secondchance', 'powerup_comeback', 'powerup_lucky',
  'expiry_x2tokens_10h', 'expiry_x3tokens_10h',
  'expiry_extra15_10h', 'expiry_extra30_10h',
  'expiry_streakbonus_10h', 'expiry_streakmaster_10h',
  'expiry_secondchance_10h', 'expiry_comebackbonus_10h', 'expiry_luckybonus_10h'
];

const nativeSetItem = Storage.prototype.setItem;
let currentUid = null;
let pushTimer = null;

// Push a debounced snapshot of the synced keys to Firestore. Debounced so a
// purchase that touches several keys in a row (e.g. spend + own a palette)
// results in one write, not several.
function schedulePush() {
  if (!currentUid) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushToCloud(currentUid), 400);
}

function pushToCloud(uid) {
  const data = {};
  for (const key of SYNCED_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return setDoc(doc(db, 'users', uid), data, { merge: true }).catch((err) => {
    console.error('Failed to sync progress to Firebase:', err);
  });
}

async function pullFromCloud(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    const data = snap.data();
    for (const key of SYNCED_KEYS) {
      if (data[key] !== undefined) {
        nativeSetItem.call(localStorage, key, data[key]);
      } else {
        localStorage.removeItem(key);
      }
    }
  }
}

function clearLocalCache() {
  for (const key of SYNCED_KEYS) localStorage.removeItem(key);
  sessionStorage.removeItem('tokens');
}

// Every write to a synced key (from anywhere in the app — main.js,
// token-shop.js, game-engine.js — none of which need to know Firebase
// exists) schedules a background push once someone is signed in.
Storage.prototype.setItem = function (key, value) {
  nativeSetItem.call(this, key, value);
  if (this === window.localStorage && currentUid && SYNCED_KEYS.includes(key)) {
    schedulePush();
  }
};

// Firebase's Email/Password provider needs an email-shaped identifier, but
// players only ever see/enter a username. This deterministically turns a
// username into the same fake, never-emailed address used when each
// account was created, so the same username always maps to the same account.
function usernameToEmail(username) {
  const slug = username.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `${slug}@mathisle-v2.local`;
}

function logIn(username, password) {
  return signInWithEmailAndPassword(auth, usernameToEmail(username), password);
}

async function logOut() {
  await signOut(auth);
  clearLocalCache();
  currentUid = null;
}

// Calls `callback(user)` once immediately with the current auth state, and
// again every time it changes. By the time callback fires, if a user is
// signed in, their Firestore data has already been pulled into localStorage.
function watchAuthState(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await pullFromCloud(user.uid);
      currentUid = user.uid;
      // Keep each doc's username field current so the admin dashboard can
      // show names instead of raw UIDs (fire-and-forget, doesn't block render).
      setDoc(doc(db, 'users', user.uid), { username: user.displayName || '' }, { merge: true }).catch(() => {});
    } else {
      clearLocalCache();
      currentUid = null;
    }
    callback(user);
  });
}

// Admin-only: fetches every account's username + token count, sorted highest
// first. Requires the viewer to be signed in (see the "allow list" rule
// above) — throws if not, or if Firestore denies the request.
async function getAllUserTokens() {
  const snap = await getDocs(collection(db, 'users'));
  const results = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    results.push({
      uid: docSnap.id,
      username: data.username || '(never logged in)',
      tokens: Number(data.tokens) || 0
    });
  });
  results.sort((a, b) => b.tokens - a.tokens);
  return results;
}

export { logIn, logOut, watchAuthState, getAllUserTokens };
