import { auth, db, adminCreateAuth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  doc, getDoc, setDoc, deleteDoc, collection, getDocs
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// A fake "user" document (in the same /users collection, so it's covered by
// the same security rule with no extra Firestore rule needed) that holds
// site-wide admin settings — currently just the competition freeze flag.
// getAllUserData filters this id out so it never shows up as a player.
const SETTINGS_DOC_ID = '_meta';

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
// Rules) so any signed-in account can read (get/list) and write ANY user's
// document — needed for the admin dashboard's leaderboard, per-player stats,
// and give/remove tokens & free-grant-item actions (see getAllUserData,
// adminAdjustTokens, adminGrantItem below):
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{uid} {
//         allow read, write: if request.auth != null;
//       }
//     }
//   }
//
// NOTE: this is intentionally wide open to any of the 46 signed-in classmate
// accounts, not just an "admin" one — Firebase's client SDK has no built-in
// concept of admin roles without a real backend (Cloud Functions / custom
// claims), which this static, no-build-tools site doesn't have. In practice
// that means any logged-in student could, with dev tools, read or edit
// anyone's tokens/boosts directly through the Firestore SDK — the admin
// page's password only gates the UI, not the data. Acceptable for a class
// token game, but don't reuse this pattern for anything sensitive.
// ============================================================

const SYNCED_KEYS = [
  'tokens', 'ownedPalettes', 'activeTheme',
  'tokenMultiplier', 'extraSeconds', 'streakInterval',
  'powerup_secondchance', 'powerup_comeback', 'powerup_lucky',
  'expiry_x2tokens_10h', 'expiry_x3tokens_10h',
  'expiry_extra15_10h', 'expiry_extra30_10h',
  'expiry_streakbonus_10h', 'expiry_streakmaster_10h',
  'expiry_secondchance_10h', 'expiry_comebackbonus_10h', 'expiry_luckybonus_10h',
  'gameHistory', 'purchaseHistory'
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

async function logIn(username, password) {
  const cred = await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  if (snap.exists() && snap.data().disabled === true) {
    await signOut(auth);
    throw new Error('This account has been deleted by the admin.');
  }
  return cred;
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

// Admin-only: fetches every account's full document (tokens, boosts,
// palettes, game history, purchase history, ...), sorted by tokens highest
// first. Requires the viewer to be signed in (see the rules above) — throws
// if not, or if Firestore denies the request.
async function getAllUserData() {
  const snap = await getDocs(collection(db, 'users'));
  const results = [];
  snap.forEach((docSnap) => {
    if (docSnap.id === SETTINGS_DOC_ID) return;
    const data = docSnap.data();
    let gameHistory = [];
    let purchaseHistory = [];
    let ownedPalettes = [];
    try { gameHistory = JSON.parse(data.gameHistory) || []; } catch {}
    try { purchaseHistory = JSON.parse(data.purchaseHistory) || []; } catch {}
    try { ownedPalettes = JSON.parse(data.ownedPalettes) || []; } catch {}
    results.push({
      uid: docSnap.id,
      username: data.username || '(never logged in)',
      tokens: Number(data.tokens) || 0,
      tokenMultiplier: Number(data.tokenMultiplier) || 1,
      extraSeconds: Number(data.extraSeconds) || 0,
      streakInterval: Number(data.streakInterval) || 0,
      powerup_secondchance: data.powerup_secondchance === '1',
      powerup_comeback: data.powerup_comeback === '1',
      powerup_lucky: data.powerup_lucky === '1',
      ownedPalettes,
      gameHistory,
      purchaseHistory,
      raw: data
    });
  });
  results.sort((a, b) => b.tokens - a.tokens);
  return results;
}

// Admin-only: adds (or, with a negative amount, removes) tokens from a
// specific player's account, clamped so it never goes below 0. Returns the
// resulting balance.
async function adminAdjustTokens(uid, delta) {
  const snap = await getDoc(doc(db, 'users', uid));
  const current = snap.exists() ? Number(snap.data().tokens) || 0 : 0;
  const next = Math.max(0, current + delta);
  await setDoc(doc(db, 'users', uid), { tokens: String(next) }, { merge: true });
  return next;
}

// Admin-only: grants a boost or palette to a player for free, without
// touching their tokens. `category` is 'permanent-boost' | 'timed-boost' |
// 'palette', `id` is the item's id from token-shop.js's item lists.
async function adminGrantItem(uid, category, id) {
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.exists() ? snap.data() : {};
  const updates = {};

  if (category === 'permanent-boost') {
    const mult = Number(data.tokenMultiplier) || 1;
    const secs = Number(data.extraSeconds) || 0;
    const streak = Number(data.streakInterval) || 0;
    if (id === 'x2tokens') updates.tokenMultiplier = String(Math.max(mult, 2));
    else if (id === 'x3tokens') updates.tokenMultiplier = String(Math.max(mult, 3));
    else if (id === 'extra15') updates.extraSeconds = String(Math.max(secs, 15));
    else if (id === 'extra30') updates.extraSeconds = String(Math.max(secs, 30));
    else if (id === 'streakbonus') updates.streakInterval = String(streak > 0 ? Math.min(streak, 5) : 5);
    else if (id === 'streakmaster') updates.streakInterval = '3';
    else if (id === 'secondchance') updates.powerup_secondchance = '1';
    else if (id === 'comebackbonus') updates.powerup_comeback = '1';
    else if (id === 'luckybonus') updates.powerup_lucky = '1';
  } else if (category === 'timed-boost') {
    // id already ends in "_10h" (e.g. "x2tokens_10h"), matching the same
    // 'expiry_<id>' key shape token-shop.js writes on a normal purchase.
    updates['expiry_' + id] = String(Date.now() + 10 * 60 * 60 * 1000);
  } else if (category === 'palette') {
    let owned = [];
    try { owned = JSON.parse(data.ownedPalettes) || []; } catch {}
    if (!owned.includes(id)) owned.push(id);
    updates.ownedPalettes = JSON.stringify(owned);
  }

  await setDoc(doc(db, 'users', uid), updates, { merge: true });
}

// Admin-only: creates a brand-new classmate account. Uses the isolated
// adminCreateAuth instance (see firebase-config.js) so this doesn't sign the
// admin out of their own session — Firebase would otherwise auto-sign-in as
// whichever account was just created.
async function adminCreateAccount(username, password) {
  const cred = await createUserWithEmailAndPassword(adminCreateAuth, usernameToEmail(username), password);
  await updateProfile(cred.user, { displayName: username });
  await setDoc(doc(db, 'users', cred.user.uid), { tokens: '0', ownedPalettes: '[]', username });
  await signOut(adminCreateAuth);
  return cred.user;
}

// Admin-only: wipes a player's progress (tokens, boosts, palettes, history)
// and marks the account disabled so it can never log back in. This can't
// remove their username/password from Firebase Authentication itself — doing
// that requires the Admin SDK, which needs a real backend this static site
// doesn't have — but it fully blocks the account from being used again and
// clears it from the leaderboard/stats.
async function adminDeleteAccount(uid) {
  await deleteDoc(doc(db, 'users', uid));
  await setDoc(doc(db, 'users', uid), { disabled: true });
}

// Site-wide switch for the admin to freeze the competition: once true, every
// action that changes a token balance (playing a game, spending in the token
// shop, tab-switch penalties) refuses to do anything — see the checks in
// main.js's awardTokens/spendTokens/penalizeTabSwitch and token-shop.js/
// game-engine.js's pre-action checks. Stored on the same shared "_meta" doc
// as everything else admin-related.
async function getCompetitionFrozen() {
  const snap = await getDoc(doc(db, 'users', SETTINGS_DOC_ID));
  return snap.exists() && snap.data().competitionFrozen === true;
}

async function setCompetitionFrozen(frozen) {
  await setDoc(doc(db, 'users', SETTINGS_DOC_ID), { competitionFrozen: frozen }, { merge: true });
}

export {
  logIn, logOut, watchAuthState,
  getAllUserData, adminAdjustTokens, adminGrantItem,
  adminCreateAccount, adminDeleteAccount,
  getCompetitionFrozen, setCompetitionFrozen
};
