import { getTokens, spendTokens, getAccountName, isCompetitionFrozen } from './main.js';
import { getCatalog } from './auth.js';

// ============================================================
// TOKEN SHOP
// ============================================================
// Renders the token shop (buying) and the separate Equip Palette page
// (choosing which owned palette is active). Three kinds of shop items,
// each persisted differently:
//   - boosts:   temporary gameplay upgrades — active for 10 hours from
//               purchase, then expire and become buyable again
//   - palettes: one-time purchase in the shop; equipped on the separate
//               Equip Palette page (or the built-in "Default" palette).
//               Grouped into three rarity tiers: Simple, Rare, Ultra Special.
//   - tutoring: a real-life reward, buyable repeatedly (no owned state),
//               sends a booking notification email via EmailJS — the ONLY
//               purchase type that emails Denys; boosts/palettes are silent.
// ============================================================

const ICONS = 'images/tokenshop-powerups/';

const EMAIL_SERVICE = 'service_dkw6mg8og';
const TUTORING_EMAIL_TEMPLATE = 'template_0y4ctoo';

const LOCK_ICON = `<svg viewBox="0 0 24 24" class="palette-lock-icon"><path d="M12 1a5 5 0 0 0-5 5v3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 0 1 6 0v3H9zm3 4a2 2 0 0 1 1 3.73V19a1 1 0 0 1-2 0v-2.27A2 2 0 0 1 12 13z"/></svg>`;

// ---- Permanent ("OG") boosts — bought once, active forever ----
function getMultiplierTier() {
  return Number(localStorage.getItem('tokenMultiplier')) || 1;
}
function setMultiplierTier(tier) {
  localStorage.setItem('tokenMultiplier', String(tier));
}
function getTimeTier() {
  return Number(localStorage.getItem('extraSeconds')) || 0;
}
function setTimeTier(tier) {
  localStorage.setItem('extraSeconds', String(tier));
}
// Streak interval: lower is better (bonus fires more often). 0 means not owned.
function getStreakTier() {
  return Number(localStorage.getItem('streakInterval')) || 0;
}
function setStreakTier(tier) {
  localStorage.setItem('streakInterval', String(tier));
}

const PERMANENT_BOOSTS = [
  {
    id: 'x2tokens',
    name: 'x2 Tokens Forever',
    desc: 'Permanently doubles the tokens you earn from every correct answer, in every game, forever.',
    price: 10500,
    icon: ICONS + 'x2-tokens.svg',
    isOwned: () => getMultiplierTier() >= 2,
    apply: () => setMultiplierTier(2)
  },
  {
    id: 'x3tokens',
    name: 'x3 Tokens Forever',
    desc: 'Upgrades your multiplier to x3 — every correct answer now earns triple tokens, forever.',
    price: 15000,
    icon: ICONS + 'x3-tokens.svg',
    isOwned: () => getMultiplierTier() >= 3,
    apply: () => setMultiplierTier(3)
  },
  {
    id: 'extra15',
    name: 'Extra 15 Seconds Forever',
    desc: 'Permanently extends every 60-second game to 75 seconds, so you can answer more questions.',
    price: 6000,
    icon: ICONS + 'extra-time.svg',
    isOwned: () => getTimeTier() >= 15,
    apply: () => setTimeTier(15)
  },
  {
    id: 'extra30',
    name: 'Extra 30 Seconds Forever',
    desc: 'Upgrades your bonus time — every game now runs for 90 seconds instead of 60.',
    price: 9000,
    icon: ICONS + 'extra-time-30.svg',
    isOwned: () => getTimeTier() >= 30,
    apply: () => setTimeTier(30)
  },
  {
    id: 'streakbonus',
    name: 'Streak Bonus Forever',
    desc: 'Get 5 correct answers in a row in a single game and earn an extra 50 tokens, every time.',
    price: 6000,
    icon: ICONS + 'streak-bonus.svg',
    isOwned: () => getStreakTier() > 0 && getStreakTier() <= 5,
    apply: () => setStreakTier(5)
  },
  {
    id: 'streakmaster',
    name: 'Streak Master Forever',
    desc: 'Upgrades your Streak Bonus — it now fires every 3 correct answers in a row instead of every 5.',
    price: 9000,
    icon: ICONS + 'streak-master.svg',
    isOwned: () => getStreakTier() > 0 && getStreakTier() <= 3,
    apply: () => setStreakTier(3)
  },
  {
    id: 'secondchance',
    name: 'Second Chance Forever',
    desc: 'Once per game, a wrong answer lets you try that exact same question again instead of losing it.',
    price: 4500,
    icon: ICONS + 'second-chance.svg',
    isOwned: () => localStorage.getItem('powerup_secondchance') === '1',
    apply: () => localStorage.setItem('powerup_secondchance', '1')
  },
  {
    id: 'comebackbonus',
    name: 'Comeback Bonus Forever',
    desc: 'After any wrong answer, your next correct answer earns an extra 25 tokens.',
    price: 10500,
    icon: ICONS + 'comeback-bonus.svg',
    isOwned: () => localStorage.getItem('powerup_comeback') === '1',
    apply: () => localStorage.setItem('powerup_comeback', '1')
  },
  {
    id: 'luckybonus',
    name: 'Lucky Bonus Forever',
    desc: 'Every correct answer has a 15% chance to double its own token reward.',
    price: 10500,
    icon: ICONS + 'lucky-bonus.svg',
    isOwned: () => localStorage.getItem('powerup_lucky') === '1',
    apply: () => localStorage.setItem('powerup_lucky', '1')
  }
];

// ---- Timed boosts — bought repeatedly, active for 10 hours from purchase ----
const BOOST_DURATION_MS = 10 * 60 * 60 * 1000;

function getBoostExpiry(id) {
  return Number(localStorage.getItem('expiry_' + id)) || 0;
}
function isBoostActive(id) {
  return Date.now() < getBoostExpiry(id);
}
function activateBoost(id) {
  localStorage.setItem('expiry_' + id, String(Date.now() + BOOST_DURATION_MS));
}

const TIMED_BOOSTS = [
  {
    id: 'x2tokens_10h',
    name: 'x2 Tokens (10h)',
    desc: 'Doubles the tokens you earn from every correct answer, in every game, for 10 hours.',
    price: 3500,
    icon: ICONS + 'x2-tokens.svg'
  },
  {
    id: 'x3tokens_10h',
    name: 'x3 Tokens (10h)',
    desc: 'Triples the tokens you earn from every correct answer, in every game, for 10 hours.',
    price: 5000,
    icon: ICONS + 'x3-tokens.svg'
  },
  {
    id: 'extra15_10h',
    name: 'Extra 15 Seconds (10h)',
    desc: 'Extends every 60-second game to 75 seconds, for 10 hours.',
    price: 2000,
    icon: ICONS + 'extra-time.svg'
  },
  {
    id: 'extra30_10h',
    name: 'Extra 30 Seconds (10h)',
    desc: 'Extends every 60-second game to 90 seconds, for 10 hours.',
    price: 3000,
    icon: ICONS + 'extra-time-30.svg'
  },
  {
    id: 'streakbonus_10h',
    name: 'Streak Bonus (10h)',
    desc: 'Get 5 correct answers in a row in a single game and earn an extra 50 tokens, for 10 hours.',
    price: 2000,
    icon: ICONS + 'streak-bonus.svg'
  },
  {
    id: 'streakmaster_10h',
    name: 'Streak Master (10h)',
    desc: 'Upgraded Streak Bonus — fires every 3 correct answers in a row instead of every 5, for 10 hours.',
    price: 3000,
    icon: ICONS + 'streak-master.svg'
  },
  {
    id: 'secondchance_10h',
    name: 'Second Chance (10h)',
    desc: 'Once per game, a wrong answer lets you try that exact same question again. Active for 10 hours.',
    price: 1500,
    icon: ICONS + 'second-chance.svg'
  },
  {
    id: 'comebackbonus_10h',
    name: 'Comeback Bonus (10h)',
    desc: 'After any wrong answer, your next correct answer earns an extra 25 tokens. Active for 10 hours.',
    price: 3500,
    icon: ICONS + 'comeback-bonus.svg'
  },
  {
    id: 'luckybonus_10h',
    name: 'Lucky Bonus (10h)',
    desc: 'Every correct answer has a 15% chance to double its own token reward, for 10 hours.',
    price: 3500,
    icon: ICONS + 'lucky-bonus.svg'
  }
];

// ---- Palettes, grouped into three rarity tiers ----

const SIMPLE_PALETTES = [
  { id: 'mint', name: 'Mint Teal Palette', desc: 'Recolours the site with fresh mint teals.', price: 300, icon: ICONS + 'palette-mint.svg', mode: 'light' },
  { id: 'crimson', name: 'Crimson Red Palette', desc: 'Recolours the site with bold crimson reds.', price: 300, icon: ICONS + 'palette-crimson.svg', mode: 'light' },
  { id: 'ocean', name: 'Ocean Blue Palette', desc: 'Recolours the site with cool ocean blues and teals.', price: 300, icon: ICONS + 'palette-ocean.svg', mode: 'light' },
  { id: 'sunset', name: 'Sunset Orange Palette', desc: 'Recolours the site with warm sunset oranges and pinks.', price: 300, icon: ICONS + 'palette-sunset.svg', mode: 'light' },
  { id: 'rose', name: 'Rose Pink Palette', desc: 'Recolours the site with soft rose pinks.', price: 300, icon: ICONS + 'palette-rose.svg', mode: 'light' },
  { id: 'amber', name: 'Golden Amber Palette', desc: 'Recolours the site with warm golden ambers.', price: 300, icon: ICONS + 'palette-amber.svg', mode: 'light' },
  { id: 'lavender', name: 'Lavender Purple Palette', desc: 'Recolours the site with soft lavender purples.', price: 300, icon: ICONS + 'palette-lavender.svg', mode: 'light' },
  { id: 'slate', name: 'Slate Grey Palette', desc: 'Recolours the site with a cool, neutral slate grey.', price: 300, icon: ICONS + 'palette-slate.svg', mode: 'light' },
  { id: 'seaside', name: 'Seaside Palette', desc: 'Recolours the site with sandy beige and turquoise seaside tones.', price: 300, icon: ICONS + 'palette-seaside.svg', mode: 'light' },
  { id: 'cherry', name: 'Cherry Blossom Palette', desc: 'Recolours the site with soft pink sakura tones.', price: 300, icon: ICONS + 'palette-cherry.svg', mode: 'light' }
];

const RARE_PALETTES = [
  { id: 'forest', name: 'Forest Green Palette', desc: 'Recolours the site with calm forest greens.', price: 600, icon: ICONS + 'palette-forest.svg', mode: 'light' },
  { id: 'midnight', name: 'Midnight Indigo Palette', desc: 'A dark, moody indigo theme for the site.', price: 600, icon: ICONS + 'palette-midnight.svg', mode: 'dark' },
  { id: 'arctic', name: 'Arctic Ice Palette', desc: 'Recolours the site with pale icy blues.', price: 600, icon: ICONS + 'palette-arctic.svg', mode: 'light' },
  { id: 'volcanic', name: 'Volcanic Ember Palette', desc: 'A dark theme with fiery orange and red embers.', price: 600, icon: ICONS + 'palette-volcanic.svg', mode: 'dark' },
  { id: 'neon', name: 'Neon Cyber Palette', desc: 'A dark theme with glowing neon cyan and magenta.', price: 600, icon: ICONS + 'palette-neon.svg', mode: 'dark' },
  { id: 'pastel', name: 'Pastel Dream Palette', desc: 'Recolours the site with soft mixed pastel tones.', price: 600, icon: ICONS + 'palette-pastel.svg', mode: 'light' },
  { id: 'mocha', name: 'Coffee Mocha Palette', desc: 'Recolours the site with warm coffee browns.', price: 600, icon: ICONS + 'palette-mocha.svg', mode: 'light' },
  { id: 'jade', name: 'Emerald Jade Palette', desc: 'Recolours the site with deep emerald greens.', price: 600, icon: ICONS + 'palette-jade.svg', mode: 'light' },
  { id: 'royal', name: 'Royal Gold Palette', desc: 'A dark regal theme with deep purple and gold.', price: 600, icon: ICONS + 'palette-royal.svg', mode: 'dark' },
  { id: 'twilight', name: 'Twilight Palette', desc: 'A moody dusk theme with deep blues and purples.', price: 600, icon: ICONS + 'palette-twilight.svg', mode: 'dark' }
];

const ULTRA_PALETTES = [
  { id: 'rainbow', name: 'Rainbow Palette', desc: 'Recolours the site with a full rainbow gradient.', price: 1000, icon: ICONS + 'palette-rainbow.svg', mode: 'light' },
  { id: 'gold', name: 'Gold Palette', desc: 'A shimmering, metallic gold theme for the site.', price: 1000, icon: ICONS + 'palette-gold.svg', mode: 'light' },
  { id: 'galaxy', name: 'Galaxy Palette', desc: 'A deep-space theme with a starry purple-blue gradient.', price: 1000, icon: ICONS + 'palette-galaxy.svg', mode: 'dark' },
  { id: 'aurora', name: 'Aurora Palette', desc: 'A flowing green-blue-purple northern-lights gradient.', price: 1000, icon: ICONS + 'palette-aurora.svg', mode: 'dark' },
  { id: 'diamond', name: 'Diamond Palette', desc: 'A sparkling icy-white and blue gradient theme.', price: 1000, icon: ICONS + 'palette-diamond.svg', mode: 'light' },
  { id: 'phoenix', name: 'Phoenix Palette', desc: 'A fiery red-orange-gold gradient theme.', price: 1250, icon: ICONS + 'palette-phoenix.svg', mode: 'dark' },
  { id: 'holographic', name: 'Holographic Palette', desc: 'A soft iridescent pastel gradient theme.', price: 1250, icon: ICONS + 'palette-holographic.svg', mode: 'light' },
  { id: 'platinum', name: 'Platinum Palette', desc: 'A premium silver metallic gradient theme.', price: 1250, icon: ICONS + 'palette-platinum.svg', mode: 'light' },
  { id: 'celestial', name: 'Celestial Palette', desc: 'A deep blue-purple night sky theme with gold stars.', price: 1500, icon: ICONS + 'palette-celestial.svg', mode: 'dark' },
  { id: 'nebula', name: 'Nebula Palette', desc: 'A cosmic pink-purple nebula cloud gradient theme.', price: 1750, icon: ICONS + 'palette-nebula.svg', mode: 'dark' }
];

const ALL_PALETTES = [...SIMPLE_PALETTES, ...RARE_PALETTES, ...ULTRA_PALETTES];

const DEFAULT_PALETTE = { id: 'default', name: 'Default', icon: ICONS + 'palette-default.svg', mode: 'light' };
const DEFAULT_DARK_PALETTE = { id: 'dark', name: 'Default Dark', icon: ICONS + 'palette-dark.svg', mode: 'dark' };

const TUTORING = [
  {
    id: 'tutor-yellow',
    name: 'Yellow Topics Tutoring',
    desc: 'Book a real 15-minute 1-to-1 tutoring session covering the Yellow-tier topics.',
    price: 1000,
    icon: ICONS + 'tutoring-yellow.svg',
    color: 'yellow'
  },
  {
    id: 'tutor-red',
    name: 'Red Topics Tutoring',
    desc: 'Book a real 15-minute 1-to-1 tutoring session covering the Red-tier topics.',
    price: 2000,
    icon: ICONS + 'tutoring-red.svg',
    color: 'red'
  }
];

// ---- Admin-added catalog items (custom palettes / multiplier tiers) ----
// Built-in items above are hardcoded lists; anything the admin adds lives in
// Firestore instead (see auth.js's getCatalog/adminAddPalette/
// adminAddMultiplier) so new items show up here with no code changes.
const LIMITED_PALETTE_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

let cachedCatalog = null;
// Surfaced as a visible banner in the shop/equip pages (rather than just a
// console.error) so a failed catalog load — e.g. a Firestore permissions
// issue — doesn't just look like "admin-added items silently don't exist".
let catalogLoadError = null;

async function ensureCatalog() {
  if (!cachedCatalog) {
    try {
      cachedCatalog = await getCatalog();
      catalogLoadError = null;
    } catch (err) {
      console.error('Failed to load the shop catalog:', err);
      catalogLoadError = err.message;
      cachedCatalog = { customPalettes: [], customMultipliers: [] };
    }
  }
  return cachedCatalog;
}

function catalogWarningHtml() {
  if (!catalogLoadError) return '';
  return `<div class="home-secondary" style="color: rgb(150, 0, 0); font-weight: bold;">
    Couldn't load admin-added palettes/multipliers (${catalogLoadError}). Built-in items below still work.
  </div>`;
}

// A small generated placeholder icon so a brand-new admin-added item looks
// reasonable immediately, without needing real artwork right away.
function multiplierIconDataUri(n) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#2e7d32" stroke="white" stroke-width="4"/><text x="50" y="63" font-size="34" font-family="Arial, sans-serif" font-weight="bold" fill="white" text-anchor="middle">x${n}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
function paletteSwatchDataUri(primaryColor, accentColor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${primaryColor}"/><rect y="70" width="100" height="30" fill="${accentColor}"/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function hexToRgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return `rgba(0, 0, 0, ${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Adapts a catalog multiplier entry into the same shape as a PERMANENT_BOOSTS
// (duration 'forever') or TIMED_BOOSTS (duration '10h') item, so the rest of
// the shop code (rendering, buying, admin grant list) can treat built-in and
// custom multipliers identically either way.
//
// A '10h' one reuses the exact 'expiry_<id>' scheme the built-in timed
// boosts use (via activateBoost/isBoostActive/getBoostExpiry, all generic by
// id already) — but since the *value* isn't fixed like x2/x3, it's also
// stashed in a matching 'multvalue_<id>' key so game-engine.js can read it
// back synchronously at game start without needing the catalog.
function customMultiplierToItem(m) {
  const icon = m.icon || multiplierIconDataUri(m.multiplier);
  if (m.duration === '10h') {
    return {
      id: m.id,
      name: m.name,
      desc: `Multiplies every correct answer's tokens by ${m.multiplier}, in every game, for 10 hours.`,
      price: m.price,
      icon,
      isCustomMultiplier: true,
      isTimed: true,
      multiplier: m.multiplier,
      activate: () => {
        activateBoost(m.id);
        localStorage.setItem('multvalue_' + m.id, String(m.multiplier));
      }
    };
  }
  return {
    id: m.id,
    name: m.name,
    desc: `Permanently multiplies every correct answer's tokens by ${m.multiplier}, forever.`,
    price: m.price,
    icon,
    isOwned: () => getMultiplierTier() >= m.multiplier,
    apply: () => setMultiplierTier(m.multiplier),
    isCustomMultiplier: true,
    multiplier: m.multiplier
  };
}

// Adapts a catalog palette entry into the same shape as a built-in palette item.
function customPaletteToItem(p) {
  return {
    id: p.id,
    name: p.name,
    desc: p.tier === 'limited'
      ? 'A limited-edition palette — active for 2 weeks from the moment you get it, then it expires.'
      : 'A custom palette recolouring the whole site.',
    price: p.price,
    icon: p.icon || paletteSwatchDataUri(p.primaryColor, p.accentColor),
    mode: p.mode,
    primaryColor: p.primaryColor,
    accentColor: p.accentColor,
    tier: p.tier,
    limited: p.tier === 'limited'
  };
}

function getPaletteExpiry(id) {
  return Number(localStorage.getItem('expiry_palette_' + id)) || 0;
}
function isLimitedPaletteExpired(id) {
  const expiry = getPaletteExpiry(id);
  return expiry > 0 && Date.now() >= expiry;
}

// Drops any limited-edition palette whose 2-week window has passed from
// ownedPalettes, and falls back to the Default palette if the expired one
// was the currently-equipped theme. Called whenever the shop/equip pages
// load, once the catalog (which is what says which owned ids are "limited")
// is available.
function pruneExpiredLimitedPalettes(catalog) {
  const limitedIds = new Set(catalog.customPalettes.filter(p => p.tier === 'limited').map(p => p.id));
  if (limitedIds.size === 0) return;
  const owned = getOwnedPalettes();
  const stillOwned = owned.filter(id => !(limitedIds.has(id) && isLimitedPaletteExpired(id)));
  if (stillOwned.length !== owned.length) {
    localStorage.setItem('ownedPalettes', JSON.stringify(stillOwned));
    const activeTheme = localStorage.getItem('activeTheme');
    if (activeTheme && !stillOwned.includes(activeTheme) && limitedIds.has(activeTheme)) {
      applyPalette('default');
    }
  }
}

function getOwnedPalettes() {
  try {
    return JSON.parse(localStorage.getItem('ownedPalettes')) || [];
  } catch {
    return [];
  }
}

// Appends one purchase to a capped history log, synced to Firebase — this is
// what the admin dashboard's "how many of each thing bought" counts come from.
function recordPurchase(item, category) {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('purchaseHistory')) || [];
  } catch {
    history = [];
  }
  history.push({ id: item.id, name: item.name, category, price: item.price, timestamp: Date.now() });
  if (history.length > 300) history = history.slice(-300);
  localStorage.setItem('purchaseHistory', JSON.stringify(history));
}

const BUILTIN_PALETTE_IDS = new Set([
  DEFAULT_PALETTE, DEFAULT_DARK_PALETTE, ...ALL_PALETTES
].map(p => p.id));

// Built-in palettes work exactly as before (a `theme-<id>` class with its
// own hand-written block in theme.css). A custom (admin-added) palette has
// no such block — instead it gets a shared `theme-custom` class, and its
// actual colours are applied as CSS variables once the catalog is loaded
// (see the generic .theme-custom rules in theme.css).
function applyPalette(id) {
  document.body.classList.forEach(cls => {
    if (cls.startsWith('theme-')) document.body.classList.remove(cls);
  });
  document.body.style.removeProperty('--palette-bg');
  document.body.style.removeProperty('--palette-accent');
  document.body.style.removeProperty('--palette-overlay');

  if (BUILTIN_PALETTE_IDS.has(id)) {
    document.body.classList.add(`theme-${id}`);
  } else {
    document.body.classList.add('theme-custom');
    ensureCatalog().then((catalog) => {
      // Bail if the palette changed again before this resolved.
      if (localStorage.getItem('activeTheme') !== id) return;
      const p = catalog.customPalettes.find(cp => cp.id === id);
      if (!p) return;
      document.body.classList.toggle('theme-custom-dark', p.mode === 'dark');
      document.body.style.setProperty('--palette-bg', p.primaryColor);
      document.body.style.setProperty('--palette-accent', p.accentColor);
      document.body.style.setProperty('--palette-overlay', hexToRgba(p.accentColor, 0.38));
    });
  }
  // Only write (and so only sync to Firebase) when the theme actually
  // changed — main.js calls this on every single page load to re-apply
  // whatever's already equipped, and that shouldn't push a Firestore write
  // every time someone just clicks a nav link.
  if (localStorage.getItem('activeTheme') !== id) {
    localStorage.setItem('activeTheme', id);
  }
}

// ---------------- Token Shop (buying) ----------------

// The full list of buyable multiplier/palette items — built-in plus
// whatever the admin has added — refreshed each time the shop renders, so
// onButtonClick (and the buy-* handlers) can look items up by id without
// caring whether they're hardcoded or from the catalog.
let currentMultiplierItems = [...PERMANENT_BOOSTS];
let currentTimedItems = [...TIMED_BOOSTS];
let currentPaletteItems = [...ALL_PALETTES];

function renderShop() {
  document.querySelector('main').innerHTML = `
    <div class="home">
      <div class="home-title">Token Shop</div>
      <div class="home-secondary">Loading shop...</div>
    </div>
  `;
  loadAndRenderShop();
}

async function loadAndRenderShop() {
  const catalog = await ensureCatalog();
  pruneExpiredLimitedPalettes(catalog);
  renderShopWithCatalog(catalog);
}

function renderShopWithCatalog(catalog) {
  const tokens = getTokens();
  const ownedPalettes = getOwnedPalettes();

  const customMultiplierItems = catalog.customMultipliers.map(customMultiplierToItem);
  currentMultiplierItems = [...PERMANENT_BOOSTS, ...customMultiplierItems.filter(i => !i.isTimed)];
  currentTimedItems = [...TIMED_BOOSTS, ...customMultiplierItems.filter(i => i.isTimed)];
  currentPaletteItems = [...ALL_PALETTES, ...catalog.customPalettes.map(customPaletteToItem)];

  const permanentBoostCards = currentMultiplierItems.map(item => {
    const owned = item.isOwned();
    const blocked = !owned && tokens < item.price;
    return renderCard(item, 'boost', {
      buttonHtml: owned
        ? `<button class="shop-buy-btn shop-owned-btn" disabled>Owned</button>`
        : `<button class="shop-buy-btn" data-action="buy-permanent-boost" data-id="${item.id}" ${blocked ? 'disabled' : ''}>Buy for ${item.price}</button>`
    });
  }).join('');

  const timedBoostCards = currentTimedItems.map(item => {
    const active = isBoostActive(item.id);
    const blocked = !active && tokens < item.price;
    let buttonHtml;
    if (active) {
      const expiryTime = new Date(getBoostExpiry(item.id)).toLocaleTimeString();
      buttonHtml = `<button class="shop-buy-btn shop-owned-btn" disabled>Active until ${expiryTime}</button>`;
    } else {
      buttonHtml = `<button class="shop-buy-btn" data-action="buy-timed-boost" data-id="${item.id}" ${blocked ? 'disabled' : ''}>Buy for ${item.price}</button>`;
    }
    return renderCard(item, 'boost', { buttonHtml });
  }).join('');

  function paletteGridHtml(list) {
    return list.map(item => {
      const owned = ownedPalettes.includes(item.id);
      const blocked = !owned && tokens < item.price;
      return renderCard(item, 'palette', {
        buttonHtml: owned
          ? `<button class="shop-buy-btn shop-owned-btn" disabled>Owned</button>`
          : `<button class="shop-buy-btn" data-action="buy-palette" data-id="${item.id}" ${blocked ? 'disabled' : ''}>Buy for ${item.price}</button>`
      });
    }).join('');
  }

  const customByTier = { simple: [], rare: [], ultra: [], limited: [] };
  catalog.customPalettes.map(customPaletteToItem).forEach((item) => {
    if (customByTier[item.tier]) customByTier[item.tier].push(item);
  });

  const limitedSectionHtml = customByTier.limited.length ? `
    <div class="shop-category-title">Limited Edition Palettes (2 Weeks)</div>
    <div class="shop-grid">${paletteGridHtml(customByTier.limited)}</div>
  ` : '';

  const tutoringCards = TUTORING.map(item => {
    const blocked = tokens < item.price;
    return renderCard(item, 'tutoring', {
      buttonHtml: `<button class="shop-buy-btn" data-action="buy-tutoring" data-id="${item.id}" ${blocked ? 'disabled' : ''}>Buy for ${item.price}</button>`
    });
  }).join('');

  document.querySelector('main').innerHTML = `
    <div class="home">
      <div class="home-title">Token Shop</div>
      <div class="home-secondary">You have ${tokens} tokens <img src="icons/token.png" class="token-count-img"> to spend.</div>
      <div class="home-secondary">Earn more by playing the games! Already own a palette? <a href="index.html?page=equip-palette">Equip it here</a>.</div>
      ${catalogWarningHtml()}
    </div>

    <div class="shop-category-title">Boosts (Forever)</div>
    <div class="shop-grid">${permanentBoostCards}</div>

    <div class="shop-category-title">Boosts (10 Hours)</div>
    <div class="shop-grid">${timedBoostCards}</div>

    <div class="shop-category-title">Simple Palettes</div>
    <div class="shop-grid">${paletteGridHtml([...SIMPLE_PALETTES, ...customByTier.simple])}</div>

    <div class="shop-category-title">Rare Palettes</div>
    <div class="shop-grid">${paletteGridHtml([...RARE_PALETTES, ...customByTier.rare])}</div>

    <div class="shop-category-title">Ultra Special Palettes</div>
    <div class="shop-grid">${paletteGridHtml([...ULTRA_PALETTES, ...customByTier.ultra])}</div>

    ${limitedSectionHtml}

    <div class="shop-category-title">Real-Life Tutoring</div>
    <div class="shop-grid">${tutoringCards}</div>
  `;

  document.querySelectorAll('.shop-buy-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', onButtonClick);
  });
}

function modeBadgeHtml(item) {
  if (!item.mode) return '';
  return item.mode === 'dark'
    ? `<div class="palette-mode-badge palette-mode-dark">🌙 Dark Mode</div>`
    : `<div class="palette-mode-badge palette-mode-light">☀️ Light Mode</div>`;
}

function renderCard(item, category, { buttonHtml }) {
  return `
    <div class="shop-item shop-item-${category}">
      <div class="shop-frame"><img src="${item.icon}" alt="${item.name}"></div>
      <div class="shop-item-name">${item.name}</div>
      ${modeBadgeHtml(item)}
      <div class="shop-item-desc">${item.desc}</div>
      <div class="shop-item-price">${item.price} <img src="icons/token.png" class="token-count-img"></div>
      ${buttonHtml}
    </div>
  `;
}

function onButtonClick(e) {
  const action = e.currentTarget.dataset.action;
  const id = e.currentTarget.dataset.id;

  if (action === 'buy-permanent-boost') {
    const item = currentMultiplierItems.find(b => b.id === id);
    buyOneTimeItem(item, item.isCustomMultiplier ? 'custom-multiplier' : 'permanent-boost', item.apply);
  } else if (action === 'buy-timed-boost') {
    const item = currentTimedItems.find(b => b.id === id);
    buyTimedBoost(item);
  } else if (action === 'buy-palette') {
    const item = currentPaletteItems.find(p => p.id === id);
    buyOneTimeItem(item, 'palette', () => {
      const owned = getOwnedPalettes();
      owned.push(item.id);
      localStorage.setItem('ownedPalettes', JSON.stringify(owned));
      if (item.limited) {
        localStorage.setItem('expiry_palette_' + item.id, String(Date.now() + LIMITED_PALETTE_DURATION_MS));
      }
    });
  } else if (action === 'buy-tutoring') {
    const item = TUTORING.find(t => t.id === id);
    buyTutoring(item);
  }
}

function buyTimedBoost(item) {
  if (isCompetitionFrozen()) {
    alert("The competition has ended — the token shop is closed while results are being gathered.");
    return;
  }
  if (!confirm(`Buy "${item.name}" for ${item.price} tokens? It will be active for 10 hours.`)) return;
  if (!spendTokens(item.price)) {
    alert("You don't have enough tokens for that yet!");
    return;
  }
  if (item.activate) item.activate(); else activateBoost(item.id);
  recordPurchase(item, item.isCustomMultiplier ? 'custom-multiplier' : 'timed-boost');
  const expiryTime = new Date(getBoostExpiry(item.id)).toLocaleTimeString();
  alert(`Purchased "${item.name}"! Active until ${expiryTime}.`);
  renderShop();
}

function buyOneTimeItem(item, category, onSuccess) {
  if (isCompetitionFrozen()) {
    alert("The competition has ended — the token shop is closed while results are being gathered.");
    return;
  }
  const confirmMsg = item.limited
    ? `Buy "${item.name}" for ${item.price} tokens? It's limited-edition — active for 2 weeks from today, then it expires.`
    : `Buy "${item.name}" for ${item.price} tokens?`;
  if (!confirm(confirmMsg)) return;
  if (!spendTokens(item.price)) {
    alert("You don't have enough tokens for that yet!");
    return;
  }
  onSuccess();
  recordPurchase(item, category);
  alert(`Purchased "${item.name}"!`);
  renderShop();
}

function buyTutoring(item) {
  if (isCompetitionFrozen()) {
    alert("The competition has ended — the token shop is closed while results are being gathered.");
    return;
  }
  if (!confirm(`Book "${item.name}" for ${item.price} tokens?`)) return;
  if (!spendTokens(item.price)) {
    alert("You don't have enough tokens for that yet!");
    return;
  }
  recordPurchase(item, 'tutoring');

  console.log("%c[TUTORING 1] buyTutoring function started!", "color: cyan; font-weight: bold;");

  // Check if your local variables actually contain data
  console.log("[TUTORING 2] Checking variables -> Name:", typeof getAccountName() !== 'undefined' ? getAccountName() : 'UNDEFINED!', "Color:", item.color, "Amount:", getTokens());

  // Prevent crash if variables are missing
  let safeName = getAccountName() ? String(getAccountName()) : "Unknown Player";
  let safeColor = String(item.color);
  let safeAmount = String(getTokens());

  let parms = {
    name: safeName,
    color: safeColor,
    amount: safeAmount
  };

  console.log("[TUTORING 3] Parameters packed successfully:", parms);
  console.log("[TUTORING 4] Sending payload to EmailJS network now...");

  emailjs.send(EMAIL_SERVICE, TUTORING_EMAIL_TEMPLATE, parms)
    .then(function(response) {
      console.log("%c[TUTORING 5 - SUCCESS] EmailJS accepted it!", "color: green; font-weight: bold;", response);
      alert(`Session booked! An email has been sent to Denys — he'll reach out to schedule your ${item.name.toLowerCase()}.`);
    })
    .catch(function(error) {
      console.log("%c[TUTORING 5 - ERROR] EmailJS rejected it!", "color: red; font-weight: bold;", error);
      alert(`Your tokens were spent, but the booking email failed to send. Please message Denys directly to confirm your ${item.name.toLowerCase()}. (Check developer console for the error.)`);
    });

  console.log("[TUTORING 6] Function execution reached the very bottom.");

  renderShop();
}

// ---------------- Equip Palette page ----------------

function formatRemaining(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

function renderEquipPalettePage() {
  document.querySelector('main').innerHTML = `
    <div class="home">
      <div class="home-title">Equip Palette</div>
      <div class="home-secondary">Loading...</div>
    </div>
  `;
  loadAndRenderEquipPage();
}

async function loadAndRenderEquipPage() {
  const catalog = await ensureCatalog();
  pruneExpiredLimitedPalettes(catalog);
  renderEquipPageWithCatalog(catalog);
}

function renderEquipPageWithCatalog(catalog) {
  const ownedPalettes = getOwnedPalettes();
  const activeTheme = localStorage.getItem('activeTheme') || 'default';
  currentPaletteItems = [...ALL_PALETTES, ...catalog.customPalettes.map(customPaletteToItem)];

  function tierHtml(list) {
    return list.map(item => {
      const owned = ownedPalettes.includes(item.id);
      const active = activeTheme === item.id;
      const remaining = item.limited && owned ? formatRemaining(getPaletteExpiry(item.id) - Date.now()) : null;
      return renderPaletteTile(item, owned, active, remaining);
    }).join('');
  }

  const defaultTiles = [
    renderPaletteTile(DEFAULT_PALETTE, true, activeTheme === 'default'),
    renderPaletteTile(DEFAULT_DARK_PALETTE, true, activeTheme === 'dark')
  ].join('');

  const customByTier = { simple: [], rare: [], ultra: [], limited: [] };
  catalog.customPalettes.map(customPaletteToItem).forEach((item) => {
    if (customByTier[item.tier]) customByTier[item.tier].push(item);
  });

  const limitedSectionHtml = customByTier.limited.length ? `
    <div class="shop-category-title">Limited Edition Palettes (2 Weeks)</div>
    <div class="shop-grid">${tierHtml(customByTier.limited)}</div>
  ` : '';

  document.querySelector('main').innerHTML = `
    <div class="home">
      <div class="home-title">Equip Palette</div>
      <div class="home-secondary">Choose which colour palette to use across the whole site.</div>
      <div class="home-secondary">Locked palettes can be bought in the <a href="index.html?page=tokenshop">Token Shop</a>.</div>
      ${catalogWarningHtml()}
    </div>

    <div class="shop-category-title">Default</div>
    <div class="shop-grid">${defaultTiles}</div>

    <div class="shop-category-title">Simple Palettes</div>
    <div class="shop-grid">${tierHtml([...SIMPLE_PALETTES, ...customByTier.simple])}</div>

    <div class="shop-category-title">Rare Palettes</div>
    <div class="shop-grid">${tierHtml([...RARE_PALETTES, ...customByTier.rare])}</div>

    <div class="shop-category-title">Ultra Special Palettes</div>
    <div class="shop-grid">${tierHtml([...ULTRA_PALETTES, ...customByTier.ultra])}</div>

    ${limitedSectionHtml}
  `;

  document.querySelectorAll('.palette-equip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      applyPalette(e.currentTarget.dataset.id);
      renderEquipPalettePage();
    });
  });
}

function renderPaletteTile(item, owned, active, remaining) {
  if (!owned) {
    return `
      <div class="shop-item shop-item-palette palette-locked">
        <div class="shop-frame">
          <img src="${item.icon}" alt="${item.name}">
          <div class="palette-lock-overlay">${LOCK_ICON}</div>
        </div>
        <div class="shop-item-name">${item.name}</div>
        ${modeBadgeHtml(item)}
        <button class="shop-buy-btn shop-owned-btn" disabled>Locked</button>
      </div>
    `;
  }
  return `
    <div class="shop-item shop-item-palette">
      <div class="shop-frame"><img src="${item.icon}" alt="${item.name}"></div>
      <div class="shop-item-name">${item.name}</div>
      ${modeBadgeHtml(item)}
      ${remaining ? `<div class="palette-mode-badge">⏳ Expires in ${remaining}</div>` : ''}
      ${active
        ? `<button class="shop-buy-btn shop-active-btn" disabled>Equipped</button>`
        : `<button class="shop-buy-btn shop-equip-btn palette-equip-btn" data-id="${item.id}">Equip</button>`}
    </div>
  `;
}

export { renderShop, renderEquipPalettePage, applyPalette, PERMANENT_BOOSTS, TIMED_BOOSTS, ALL_PALETTES };
