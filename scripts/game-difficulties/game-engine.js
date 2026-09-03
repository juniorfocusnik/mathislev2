import { getRandomQuestion } from '../questions.js';
import { awardTokens, penalizeTabSwitch, isCompetitionFrozen } from '../main.js';

// ============================================================
// GAME ENGINE
// ============================================================
// Drives the 60-second "answer as many questions as you can" game
// for every difficulty. One engine, configured per difficulty,
// instead of five near-identical copy-pasted files.
// ============================================================

const DIFFICULTY_CONFIG = {
  'game-normal-play':         { key: 'normal',        tokensPerCorrect: 10,  name: 'Normal',         startPage: 'game-normal-start' },
  'game-hard-play':           { key: 'hard',          tokensPerCorrect: 25,  name: 'Hard',           startPage: 'game-hard-start' },
  'game-master-play':         { key: 'master',        tokensPerCorrect: 50,  name: 'Master',         startPage: 'game-master-start' },
  'game-easy-denys-play':     { key: 'easyDenys',     tokensPerCorrect: 100, name: 'Easy Denys',     startPage: 'game-easy-denys-start' },
  'game-ultimate-denys-play': { key: 'ultimateDenys', tokensPerCorrect: 150, name: 'Ultimate Denys', startPage: 'game-ultimate-denys-start' }
};

const BASE_GAME_DURATION_MS = 60000;
const FEEDBACK_FLASH_MS = 500;

const params = new URLSearchParams(window.location.search);
const config = DIFFICULTY_CONFIG[params.get('page')];

if (config) {
  runGame(config);
}

function formatTime(msRemaining) {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function normalizeAnswer(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

// Multiplication is commutative, so a term like "sp" and "ps" are the same
// answer — but the generators always pick one fixed spelling. Rather than
// mark a student wrong for writing the letters of a product in a different
// (equally valid) order, sort the letters within each term before comparing.
// Scoped narrowly so word answers ("yes", "neither", ...), fractions ("3/4"),
// ratios ("2:3"), and inequalities ("x > 5") are never touched — only strings
// that already look like a bare algebraic expression, and only when there's
// real algebraic structure (multiple +/- terms, or digits/^ mixed with
// letters), not a single bare word.
function canonicalizeAlgebra(value) {
  if (!/^[a-z0-9^+-]+$/.test(value)) return value;

  const terms = value.match(/[+-]?[^+-]+/g) || [value];
  const looksAlgebraic = terms.length > 1 || /\d|\^/.test(value);
  if (!looksAlgebraic) return value;

  return terms.map(term => {
    const sign = (term[0] === '+' || term[0] === '-') ? term[0] : '';
    const body = sign ? term.slice(1) : term;
    const m = body.match(/^(\d*\.?\d*)([a-z]*)(\^\d+)?$/);
    if (!m) return term;
    const [, coeff, letters, power] = m;
    const sortedLetters = letters.length > 1 ? letters.split('').sort().join('') : letters;
    return sign + coeff + sortedLetters + (power || '');
  }).join('');
}

function answersMatch(rawValue, expected) {
  const a = normalizeAnswer(rawValue);
  const b = normalizeAnswer(expected);
  return a === b || canonicalizeAlgebra(a) === canonicalizeAlgebra(b);
}

// Permanent ("Forever") boosts store a tier/flag directly. Timed boosts are
// active for 10 hours from purchase via an 'expiry_<id>' timestamp. Both are
// written by scripts/token-shop.js — a game uses whichever is currently active.
function isTimedBoostActive(id) {
  return Date.now() < (Number(localStorage.getItem('expiry_' + id + '_10h')) || 0);
}

// Appends one finished game to a capped history log, synced to Firebase like
// everything else — this is what the admin dashboard's per-player stats and
// game log are built from.
function recordGameResult(entry) {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('gameHistory')) || [];
  } catch {
    history = [];
  }
  history.push(entry);
  if (history.length > 200) history = history.slice(-200);
  localStorage.setItem('gameHistory', JSON.stringify(history));
}

function runGame(config) {
  if (isCompetitionFrozen()) {
    document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Competition Ended</div>
        <div class="home-secondary">The admin has frozen the competition while results are being gathered — games can't be played right now.</div>
        <div class="home-secondary">Link back home: <a href="index.html?page=home">CLICK!</a></div>
      </div>
    `;
    return;
  }

  const permanentMultiplier = Number(localStorage.getItem('tokenMultiplier')) || 1;
  const timedMultiplier = isTimedBoostActive('x3tokens') ? 3 : isTimedBoostActive('x2tokens') ? 2 : 1;
  const tokenMultiplier = Math.max(permanentMultiplier, timedMultiplier);

  const permanentBonusSeconds = Number(localStorage.getItem('extraSeconds')) || 0;
  const timedBonusSeconds = isTimedBoostActive('extra30') ? 30 : isTimedBoostActive('extra15') ? 15 : 0;
  const bonusSeconds = Math.max(permanentBonusSeconds, timedBonusSeconds);

  const permanentStreakInterval = Number(localStorage.getItem('streakInterval')) || 0;
  const timedStreakInterval = isTimedBoostActive('streakmaster') ? 3 : isTimedBoostActive('streakbonus') ? 5 : 0;
  const activeStreakIntervals = [permanentStreakInterval, timedStreakInterval].filter(v => v > 0);
  const streakInterval = activeStreakIntervals.length ? Math.min(...activeStreakIntervals) : 0;
  const hasStreakBonus = streakInterval > 0;

  const hasSecondChance = localStorage.getItem('powerup_secondchance') === '1' || isTimedBoostActive('secondchance');
  const hasComeback = localStorage.getItem('powerup_comeback') === '1' || isTimedBoostActive('comebackbonus');
  const hasLucky = localStorage.getItem('powerup_lucky') === '1' || isTimedBoostActive('luckybonus');
  const durationMs = BASE_GAME_DURATION_MS + bonusSeconds * 1000;

  const startTime = Date.now();
  const endTime = startTime + durationMs;

  let questionsDone = 0;
  let correctCount = 0;
  let runTokensEarned = 0;
  // Split of runTokensEarned for the admin dashboard: "normal" is what a
  // correct answer would earn with no boosts at all; "bonus" is everything
  // on top of that — the extra multiplier tokens, comeback/streak/lucky
  // bonuses, and (since the question wouldn't exist without it) the *entire*
  // reward for any answer given during bonus extra-time, past the base 60s.
  let runNormalEarned = 0;
  let runBonusEarned = 0;
  let currentQuestion = null;
  let finished = false;
  let locked = false; // true while a feedback flash is showing, to block double submits
  let awayFromTab = false;
  let currentStreak = 0;
  let secondChanceUsed = false; // Second Chance is a once-per-game resource
  let comebackPending = false; // Comeback Bonus: true right after a wrong answer

  document.querySelector('main').innerHTML = `
    <div class="home game-shell">
      <div class="home-title">${config.name}</div>
      <div class="home-secondary game-timer">Time left: ${formatTime(durationMs)}</div>
      <div class="home-secondary game-progress">Answered: 0 | Correct: 0 | Tokens won: 0</div>
    </div>
    <div class="home game-question-card game-difficulty-${config.key}">
      <div class="home-title game-question-text">Loading question...</div>
      <div class="game-input-row">
        <input type="text" class="game-answer-input" autocomplete="off" spellcheck="false" placeholder="Type your answer...">
        <button type="button" class="game-submit-btn">Submit</button>
      </div>
      <div class="game-feedback"></div>
    </div>
  `;

  const timerEl = document.querySelector('.game-timer');
  const progressEl = document.querySelector('.game-progress');
  const questionTextEl = document.querySelector('.game-question-text');
  const inputEl = document.querySelector('.game-answer-input');
  const submitBtn = document.querySelector('.game-submit-btn');
  const feedbackEl = document.querySelector('.game-feedback');

  loadNextQuestion();
  inputEl.focus();

  submitBtn.addEventListener('click', handleSubmit);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('focus', onWindowFocus);

  const tickHandle = setInterval(tick, 200);
  tick();

  function loadNextQuestion() {
    let attempts = 0;
    currentQuestion = null;
    while (!currentQuestion && attempts < 5) {
      attempts++;
      try {
        currentQuestion = getRandomQuestion(config.key);
      } catch (err) {
        console.error('Failed to generate a question, retrying:', err);
      }
    }
    if (!currentQuestion) {
      // Every retry failed — fall back to a trivial, always-answerable question
      // rather than leaving the player stuck on a broken one.
      currentQuestion = { text: 'What is 2 + 2?', answer: '4' };
    }
    questionTextEl.textContent = currentQuestion.text;
  }

  function updateProgressDisplay() {
    progressEl.textContent = `Answered: ${questionsDone} | Correct: ${correctCount} | Tokens won: ${runTokensEarned}`;
  }

  function onVisibilityChange() {
    if (document.hidden) {
      awayFromTab = true;
    } else if (awayFromTab) {
      catchTabSwitch();
    }
  }

  function onWindowBlur() {
    if (!document.hidden) awayFromTab = true;
  }

  function onWindowFocus() {
    if (awayFromTab) catchTabSwitch();
  }

  function catchTabSwitch() {
    if (finished) return;
    finished = true;
    clearInterval(tickHandle);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onWindowBlur);
    window.removeEventListener('focus', onWindowFocus);

    const deducted = penalizeTabSwitch();
    recordGameResult({
      difficulty: config.key,
      correct: correctCount,
      wrong: questionsDone - correctCount,
      tokensEarned: runTokensEarned,
      normalEarned: runNormalEarned,
      bonusEarned: runBonusEarned,
      cheated: true,
      tokensLost: deducted,
      timestamp: Date.now()
    });
    alert(`Cheating detected! You switched tabs or windows during the game.\n\nYou lost ${deducted} tokens.\n\nYou are being redirected back home.`);
    window.location.href = 'index.html?page=home';
  }

  function handleSubmit() {
    if (finished || locked) return;

    const rawValue = inputEl.value;
    if (rawValue.trim() === '') {
      feedbackEl.textContent = 'Type an answer first!';
      feedbackEl.className = 'game-feedback game-feedback-neutral';
      return;
    }

    const isCorrect = answersMatch(rawValue, currentQuestion.answer);

    // Second Chance: a wrong answer doesn't cost you the question the first time
    // it happens in a game — you get to retry that exact same question once.
    if (!isCorrect && hasSecondChance && !secondChanceUsed) {
      secondChanceUsed = true;
      feedbackEl.textContent = 'Not quite — Second Chance activated! Try this exact question again.';
      feedbackEl.className = 'game-feedback game-feedback-neutral';

      locked = true;
      inputEl.disabled = true;
      submitBtn.disabled = true;
      inputEl.value = '';

      setTimeout(() => {
        if (finished) return;
        locked = false;
        inputEl.disabled = false;
        submitBtn.disabled = false;
        feedbackEl.textContent = '';
        feedbackEl.className = 'game-feedback';
        inputEl.focus();
        // currentQuestion is left unchanged — no loadNextQuestion() call here.
      }, FEEDBACK_FLASH_MS);
      return;
    }

    questionsDone++;

    if (isCorrect) {
      correctCount++;
      currentStreak++;
      let reward = config.tokensPerCorrect * tokenMultiplier;
      const bonusParts = [];

      if (hasComeback && comebackPending) {
        reward += 25;
        bonusParts.push('+25 comeback');
        comebackPending = false;
      }
      if (hasStreakBonus && currentStreak % streakInterval === 0) {
        reward += 50;
        bonusParts.push('+50 streak');
      }
      if (hasLucky && Math.random() < 0.15) {
        reward *= 2;
        bonusParts.push('lucky x2');
      }

      runTokensEarned += reward;
      awardTokens(reward);

      const wasBonusTime = (Date.now() - startTime) > BASE_GAME_DURATION_MS;
      if (wasBonusTime) {
        runBonusEarned += reward;
      } else {
        runNormalEarned += config.tokensPerCorrect;
        runBonusEarned += reward - config.tokensPerCorrect;
      }

      const bonusText = bonusParts.length ? ` (${bonusParts.join(', ')}!)` : '';
      feedbackEl.textContent = `Correct! +${reward} tokens${bonusText}`;
      feedbackEl.className = 'game-feedback game-feedback-correct';
    } else {
      currentStreak = 0;
      if (hasComeback) comebackPending = true;
      feedbackEl.textContent = `Incorrect. The answer was: ${currentQuestion.answer}`;
      feedbackEl.className = 'game-feedback game-feedback-incorrect';
    }

    updateProgressDisplay();

    locked = true;
    inputEl.disabled = true;
    submitBtn.disabled = true;
    inputEl.value = '';

    setTimeout(() => {
      if (finished) return;
      locked = false;
      inputEl.disabled = false;
      submitBtn.disabled = false;
      feedbackEl.textContent = '';
      feedbackEl.className = 'game-feedback';
      loadNextQuestion();
      inputEl.focus();
    }, FEEDBACK_FLASH_MS);
  }

  function tick() {
    if (finished) return;
    const remaining = endTime - Date.now();
    timerEl.textContent = `Time left: ${formatTime(remaining)}`;
    if (remaining <= 0) {
      endGame();
    }
  }

  function endGame() {
    if (finished) return;
    finished = true;
    clearInterval(tickHandle);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onWindowBlur);
    window.removeEventListener('focus', onWindowFocus);

    recordGameResult({
      difficulty: config.key,
      correct: correctCount,
      wrong: questionsDone - correctCount,
      tokensEarned: runTokensEarned,
      normalEarned: runNormalEarned,
      bonusEarned: runBonusEarned,
      cheated: false,
      timestamp: Date.now()
    });

    document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Game Results: ${config.name}</div>
        <div class="home-secondary">Tokens won: ${runTokensEarned} <img class="token-count-img" src="icons/token.png"></div>
        <div class="home-secondary">Correct answers: ${correctCount} / ${questionsDone}</div>
        <div class="home-secondary">Play again: <a href="index.html?page=${config.startPage}">CLICK!</a></div>
        <div class="home-secondary">Link back home: <a href="index.html?page=home">CLICK!</a></div>
      </div>
    `;
  }
}

export { runGame };
