import { getTokens, spendTokens, getAccountName } from './main.js';

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
//               sends a booking notification email via EmailJS
// ============================================================

const ICONS = 'images/tokenshop-powerups/';

// EmailJS config. Every purchase notifies Denys: tutoring uses its own
// dedicated template (booking details); everything else (boosts, palettes)
// uses the same template the Save page uses, since there's no real backend —
// email is how Denys finds out tokens were spent.
const EMAIL_SERVICE = 'service_dkw6mg8og';
const PURCHASE_EMAIL_TEMPLATE = 'template_unhloza';
const TUTORING_EMAIL_TEMPLATE = 'template_0y4ctoo';

// Fire-and-forget notification for a non-tutoring purchase (boost/palette).
// Uses the same {{name}}/{{count}} shape as the Save page's email.
function notifyPurchase() {
  emailjs.send(EMAIL_SERVICE, PURCHASE_EMAIL_TEMPLATE, {
    name: getAccountName() || 'Unknown Player',
    count: String(getTokens())
  }).catch((err) => {
    console.error('Failed to send the purchase notification email:', err);
  });
}

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

function applyPalette(id) {
  document.body.classList.forEach(cls => {
    if (cls.startsWith('theme-')) document.body.classList.remove(cls);
  });

  document.body.classList.add(`theme-${id}`);
  localStorage.setItem('activeTheme', id);
}

// ---------------- Token Shop (buying) ----------------

function renderShop() {
  const tokens = getTokens();
  const ownedPalettes = getOwnedPalettes();

  const permanentBoostCards = PERMANENT_BOOSTS.map(item => {
    const owned = item.isOwned();
    const blocked = !owned && tokens < item.price;
    return renderCard(item, 'boost', {
      buttonHtml: owned
        ? `<button class="shop-buy-btn shop-owned-btn" disabled>Owned</button>`
        : `<button class="shop-buy-btn" data-action="buy-permanent-boost" data-id="${item.id}" ${blocked ? 'disabled' : ''}>Buy for ${item.price}</button>`
    });
  }).join('');

  const timedBoostCards = TIMED_BOOSTS.map(item => {
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
    </div>

    <div class="shop-category-title">Boosts (Forever)</div>
    <div class="shop-grid">${permanentBoostCards}</div>

    <div class="shop-category-title">Boosts (10 Hours)</div>
    <div class="shop-grid">${timedBoostCards}</div>

    <div class="shop-category-title">Simple Palettes</div>
    <div class="shop-grid">${paletteGridHtml(SIMPLE_PALETTES)}</div>

    <div class="shop-category-title">Rare Palettes</div>
    <div class="shop-grid">${paletteGridHtml(RARE_PALETTES)}</div>

    <div class="shop-category-title">Ultra Special Palettes</div>
    <div class="shop-grid">${paletteGridHtml(ULTRA_PALETTES)}</div>

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
    const item = PERMANENT_BOOSTS.find(b => b.id === id);
    buyOneTimeItem(item, 'permanent-boost', item.apply);
  } else if (action === 'buy-timed-boost') {
    const item = TIMED_BOOSTS.find(b => b.id === id);
    buyTimedBoost(item);
  } else if (action === 'buy-palette') {
    const item = ALL_PALETTES.find(p => p.id === id);
    buyOneTimeItem(item, 'palette', () => {
      const owned = getOwnedPalettes();
      owned.push(item.id);
      localStorage.setItem('ownedPalettes', JSON.stringify(owned));
    });
  } else if (action === 'buy-tutoring') {
    const item = TUTORING.find(t => t.id === id);
    buyTutoring(item);
  }
}

function buyTimedBoost(item) {
  if (!confirm(`Buy "${item.name}" for ${item.price} tokens? It will be active for 10 hours.`)) return;
  if (!spendTokens(item.price)) {
    alert("You don't have enough tokens for that yet!");
    return;
  }
  activateBoost(item.id);
  recordPurchase(item, 'timed-boost');
  const expiryTime = new Date(getBoostExpiry(item.id)).toLocaleTimeString();
  alert(`Purchased "${item.name}"! Active until ${expiryTime}.`);
  notifyPurchase();
  renderShop();
}

function buyOneTimeItem(item, category, onSuccess) {
  if (!confirm(`Buy "${item.name}" for ${item.price} tokens?`)) return;
  if (!spendTokens(item.price)) {
    alert("You don't have enough tokens for that yet!");
    return;
  }
  onSuccess();
  recordPurchase(item, category);
  alert(`Purchased "${item.name}"!`);
  notifyPurchase();
  renderShop();
}

function buyTutoring(item) {
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

function renderEquipPalettePage() {
  const ownedPalettes = getOwnedPalettes();
  const activeTheme = localStorage.getItem('activeTheme') || 'default';

  function tierHtml(list) {
    return list.map(item => {
      const owned = ownedPalettes.includes(item.id);
      const active = activeTheme === item.id;
      return renderPaletteTile(item, owned, active);
    }).join('');
  }

  const defaultTiles = [
    renderPaletteTile(DEFAULT_PALETTE, true, activeTheme === 'default'),
    renderPaletteTile(DEFAULT_DARK_PALETTE, true, activeTheme === 'dark')
  ].join('');

  document.querySelector('main').innerHTML = `
    <div class="home">
      <div class="home-title">Equip Palette</div>
      <div class="home-secondary">Choose which colour palette to use across the whole site.</div>
      <div class="home-secondary">Locked palettes can be bought in the <a href="index.html?page=tokenshop">Token Shop</a>.</div>
    </div>

    <div class="shop-category-title">Default</div>
    <div class="shop-grid">${defaultTiles}</div>

    <div class="shop-category-title">Simple Palettes</div>
    <div class="shop-grid">${tierHtml(SIMPLE_PALETTES)}</div>

    <div class="shop-category-title">Rare Palettes</div>
    <div class="shop-grid">${tierHtml(RARE_PALETTES)}</div>

    <div class="shop-category-title">Ultra Special Palettes</div>
    <div class="shop-grid">${tierHtml(ULTRA_PALETTES)}</div>
  `;

  document.querySelectorAll('.palette-equip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      applyPalette(e.currentTarget.dataset.id);
      renderEquipPalettePage();
    });
  });
}

function renderPaletteTile(item, owned, active) {
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
      ${active
        ? `<button class="shop-buy-btn shop-active-btn" disabled>Equipped</button>`
        : `<button class="shop-buy-btn shop-equip-btn palette-equip-btn" data-id="${item.id}">Equip</button>`}
    </div>
  `;
}

export { renderShop, renderEquipPalettePage, applyPalette, PERMANENT_BOOSTS, TIMED_BOOSTS, ALL_PALETTES };
