// ============================================================
// MATHISLE QUESTION MATRIX
// ============================================================
// Structure:
//   questions[difficulty] = [ topic0Templates, topic1Templates, ... ]
//   topicXTemplates = [ templateFn0, templateFn1, ... ]
//   each templateFn() returns a fresh, randomized { text, answer }
//   where text and answer are plain strings.
//
// This avoids pre-baking thousands of literal question objects —
// each template generates a new random variant every time it's called.
//
// getRandomQuestion(difficulty) picks a random topic, then a random
// template within that topic, then calls it.
// ============================================================

let questions = {
  normal: [],
  hard: [],
  master: [],
  easyDenys: [],
  ultimateDenys: []
};

// ---------------- helpers ----------------

function randInt(min, max) {
  // inclusive both ends
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function randLetter() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return letters[randInt(0, letters.length - 1)];
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function simplifyFraction(num, den) {
  const g = gcd(num, den) || 1;
  return [num / g, den / g];
}

function midpoint(a, b) {
  return (a + b) / 2;
}

// Shared helpers for chart-based topics (Topic 6)
function buildDistinctValues(n, min, max) {
  let values;
  do {
    values = [];
    for (let i = 0; i < n; i++) values.push(randInt(min, max));
  } while (new Set(values).size !== n);
  return values;
}

const CHART_THEMES = [
  { pool: ["cats", "dogs", "hamsters", "rabbits", "birds"], phrase: "the number of people who like" },
  { pool: ["red", "green", "blue", "yellow", "purple"], phrase: "the number of people whose favourite colour is" },
  { pool: ["maths", "English", "science", "art", "history"], phrase: "the number of people whose favourite subject is" }
];

function pickThemeCategories(n) {
  const theme = randChoice(CHART_THEMES);
  const labels = [...theme.pool].sort(() => Math.random() - 0.5).slice(0, n);
  return { theme, labels };
}

// Topic 7 helper: a fraction already in simplest form, restricted to "nice" denominators.
const NICE_DENOMINATORS = [2, 4, 5, 8, 10, 20, 25, 40, 50, 75, 100, 200, 500, 1000];

function randSimplifiedFraction() {
  let den, num;
  do {
    den = randChoice(NICE_DENOMINATORS);
    num = randInt(1, den - 1);
  } while (gcd(num, den) !== 1);
  return { num, den };
}

function fractionToDecimal(num, den) {
  return Math.round((num / den) * 10000) / 10000;
}

function fractionToPercent(num, den) {
  return Math.round((num / den) * 100 * 100) / 100;
}

// Topic 8 helper: multiply an "outside" factor (number or letter) by a single
// bracket term (number or letter), producing the resulting monomial string.
// outside/term shape: { kind: 'number'|'letter', value: number|string }
function letterTimes(outside, term) {
  if (outside.kind === "number" && term.kind === "number") {
    return `${outside.value * term.value}`;
  }
  if (outside.kind === "number" && term.kind === "letter") {
    return `${outside.value}${term.value}`;
  }
  if (outside.kind === "letter" && term.kind === "number") {
    return formatLeadCoeff(term.value, outside.value);
  }
  // letter * letter
  if (outside.value === term.value) {
    return `${outside.value}^2`;
  }
  return [outside.value, term.value].sort().join("");
}

// ---- Shared answer-string formatters for simplified algebraic terms ----
// These exist so generated answers always match the simplest form a student
// would naturally type (e.g. "n" not "1n", "4n-3" not "4n+-3", "4n" not "4n+0"),
// since answers are checked with an exact string match.

// Formats a coefficient + letter monomial as the *leading* term of an expression.
// e.g. formatLeadCoeff(3, "x") -> "3x", formatLeadCoeff(1, "x") -> "x",
//      formatLeadCoeff(-1, "x") -> "-x", formatLeadCoeff(0, "x") -> ""
function formatLeadCoeff(coefficient, letter) {
  if (coefficient === 0) return "";
  if (coefficient === 1) return letter;
  if (coefficient === -1) return `-${letter}`;
  return `${coefficient}${letter}`;
}

// Formats a coefficient + letter monomial as a term being *added* after another term.
// e.g. formatAddedTerm(3, "x") -> "+3x", formatAddedTerm(1, "x") -> "+x",
//      formatAddedTerm(-1, "x") -> "-x", formatAddedTerm(0, "x") -> ""
function formatAddedTerm(coefficient, letter) {
  if (coefficient === 0) return "";
  if (coefficient === 1) return `+${letter}`;
  if (coefficient === -1) return `-${letter}`;
  return coefficient > 0 ? `+${coefficient}${letter}` : `${coefficient}${letter}`;
}

// Formats a plain constant being added after another term.
// e.g. formatAddedConstant(5) -> "+5", formatAddedConstant(-3) -> "-3", formatAddedConstant(0) -> ""
function formatAddedConstant(value) {
  if (value === 0) return "";
  return value > 0 ? `+${value}` : `${value}`;
}

// Formats "coefficient*letter + constant" as a standalone linear expression.
// e.g. formatLinearTerm(4, "n", 0) -> "4n", formatLinearTerm(1, "n", -3) -> "n-3"
function formatLinearTerm(coefficient, letter, constant) {
  return (formatLeadCoeff(coefficient, letter) + formatAddedConstant(constant)) || "0";
}

// ============================================================
// NORMAL — Green topics
// ============================================================

// ---- Topic 1: Primary School Calculations ----
const t1_primary = [
  () => {
    const a = randInt(10, 99);
    const b = randInt(10, 99);
    return {
      text: `What is ${a} + ${b}?`,
      answer: `${a + b}`
    };
  },
  () => {
    const a = randInt(20, 200);
    const b = randInt(1, a);
    return {
      text: `What is ${a} - ${b}?`,
      answer: `${a - b}`
    };
  },
  () => {
    const a = randInt(2, 12);
    const b = randInt(2, 12);
    return {
      text: `What is ${a} x ${b}?`,
      answer: `${a * b}`
    };
  },
  () => {
    const b = randInt(2, 12);
    const result = randInt(2, 12);
    const a = b * result;
    return {
      text: `What is ${a} / ${b}?`,
      answer: `${result}`
    };
  },
  () => {
    const a = randInt(100, 999);
    const b = randInt(100, 999);
    return {
      text: `What is ${a} + ${b}?`,
      answer: `${a + b}`
    };
  },
  () => {
    const a = randInt(100, 999);
    const b = randInt(100, a);
    return {
      text: `What is ${a} - ${b}?`,
      answer: `${a - b}`
    };
  },
  () => {
    const a = randInt(1000, 9999);
    const b = randInt(1000, 9999);
    return {
      text: `What is ${a} + ${b}?`,
      answer: `${a + b}`
    };
  },
  () => {
    const a = randInt(1000, 9999);
    const b = randInt(1000, a);
    return {
      text: `What is ${a} - ${b}?`,
      answer: `${a - b}`
    };
  },
  // ---- BIDMAS ----
  () => {
    const a = randInt(2, 10);
    const b = randInt(2, 10);
    const c = randInt(2, 10);
    return {
      text: `What is ${a} + ${b} x ${c}? (remember BIDMAS)`,
      answer: `${a + b * c}`
    };
  },
  () => {
    const a = randInt(2, 10);
    const b = randInt(2, 10);
    const c = randInt(2, 10);
    return {
      text: `What is (${a} + ${b}) x ${c}? (remember BIDMAS)`,
      answer: `${(a + b) * c}`
    };
  },
  () => {
    // b*c generated first, then a is built on top of it so the result is
    // always non-negative — negative-number arithmetic is reserved for Hard.
    const b = randInt(2, 5);
    const c = randInt(2, 10);
    const a = b * c + randInt(1, 15);
    return {
      text: `What is ${a} - ${b} x ${c}? (remember BIDMAS)`,
      answer: `${a - b * c}`
    };
  },
  () => {
    const b = randInt(2, 6);
    const cResult = randInt(2, 6);
    const c = b * cResult;
    const a = randInt(2, 10);
    return {
      text: `What is ${a} + ${c} / ${b}? (remember BIDMAS)`,
      answer: `${a + c / b}`
    };
  },
  // ---- Place Value Knowledge ----
  () => {
    const places = ["units", "tens", "hundreds", "thousands"];
    const place = randChoice(places);
    const n = randInt(1000, 9999);
    const digits = String(n).split("").reverse(); // [units, tens, hundreds, thousands]
    const idx = places.indexOf(place);
    return {
      text: `In the number ${n}, what digit is in the ${place} column? Name the digit itself.`,
      answer: `${digits[idx]}`
    };
  },
  () => {
    const n = randInt(1000, 999999);
    return {
      text: `What is the value of the digit ${String(n)[0]} in the number ${n}?`,
      answer: `${Number(String(n)[0]) * Math.pow(10, String(n).length - 1)}`
    };
  },
  () => {
    const n = randInt(100, 9999);
    const roundTo = randChoice([10, 100]);
    const rounded = Math.round(n / roundTo) * roundTo;
    return {
      text: `Round ${n} to the nearest ${roundTo}.`,
      answer: `${rounded}`
    };
  },
  // ---- <, >, = ----
  () => {
    const a = randInt(1, 1000);
    let b = randInt(1, 1000);
    // avoid accidental equality unless deliberate
    if (b === a) b = a + 1;
    return {
      text: `Compare the numbers: ${a} ___ ${b}. Write <, > or =.`,
      answer: a < b ? "<" : (a > b ? ">" : "=")
    };
  },
  () => {
    const a = randInt(1, 1000);
    return {
      text: `Compare the numbers: ${a} ___ ${a}. Write <, > or =.`,
      answer: "="
    };
  },
  () => {
    const a = randInt(1, 50);
    const b = randInt(1, 50);
    const c = randInt(1, 50);
    if (a === b || b === c || a === c) {
      // fallback simple distinct set if collision happens
      return {
        text: `Order these numbers from smallest to largest: 5, 12, 3. Separate the numbers with ", " exactly.`,
        answer: "3, 5, 12"
      };
    }
    const sorted = [a, b, c].sort((x, y) => x - y);
    return {
      text: `Order these numbers from smallest to largest: ${a}, ${b}, ${c}. Separate the numbers with ", " exactly.`,
      answer: sorted.join(", ")
    };
  }
];

// ---- Topic 2: Algebraic Notation ----
const t2_algNotation = [
  () => {
    const letter = randLetter();
    const n = randInt(2, 100);
    return {
      text: `Write ${letter} times ${n} in algebraic notation.`,
      answer: `${n}${letter}`
    };
  },
  () => {
    const letter = randLetter();
    const n = randInt(2, 100);
    return {
      text: `Write ${letter} divided by ${n} in algebraic notation, using / as the fraction's line.`,
      answer: `${letter}/${n}`
    };
  },
  () => {
    const letter = randLetter();
    const n = randInt(2, 100);
    return {
      text: `Write ${n} divided by ${letter} in algebraic notation, using / as the fraction's line.`,
      answer: `${n}/${letter}`
    };
  },
  () => {
    const letter = randLetter();
    const n = randInt(2, 100);
    const letterFirst = Math.random() < 0.5;
    const spaced = Math.random() < 0.5;
    const plus = spaced ? " + " : "+";
    const answer = letterFirst ? `${letter}${plus}${n}` : `${n}${plus}${letter}`;
    return {
      text: `Write the sum of ${letter} and ${n} in algebraic notation.`,
      answer: answer
    };
  },
  () => {
    const letter = randLetter();
    const n = randInt(2, 100);
    return {
      text: `Write ${n} subtracted from ${letter} in algebraic notation. Write your answer without spaces.`,
      answer: `${letter}-${n}`
    };
  },
  () => {
    const letter = randLetter();
    const n = randInt(2, 100);
    return {
      text: `Write ${letter} subtracted from ${n} in algebraic notation. Write your answer without spaces.`,
      answer: `${n}-${letter}`
    };
  }
];

// ---- Topic 3: Angle calculations ----
const t3_angleCalc = [
  () => {
    const a = randInt(10, 160);
    return {
      text: `Two angles lie on a straight line. One is ${a} degrees. What is the other? _____ degrees`,
      answer: `${180 - a}`
    };
  },
  () => {
    const a = randInt(10, 250);
    return {
      text: `Two angles lie around a point. One is ${a} degrees. What is the other? _____ degrees`,
      answer: `${360 - a}`
    };
  },
  () => {
    const a = randInt(10, 80);
    const b = randInt(10, 80);
    return {
      text: `A triangle has angles A, B and C. Angle A is ${a} degrees and angle B is ${b} degrees. What is angle C? _____ degrees`,
      answer: `${180 - a - b}`
    };
  },
  // ---- Quadrilateral missing angle ----
  () => {
    const a = randInt(30, 100);
    const b = randInt(30, 100);
    const c = randInt(30, 100);
    return {
      text: `A quadrilateral has angles A, B, C and D. Angle A is ${a} degrees, angle B is ${b} degrees and angle C is ${c} degrees. What is angle D? _____ degrees`,
      answer: `${360 - a - b - c}`
    };
  },
  // ---- Equilateral triangle ----
  () => {
    return {
      text: `An equilateral triangle has three equal angles. What is the size of each angle? _____ degrees`,
      answer: "60"
    };
  },
  // ---- Isosceles triangle ----
  () => {
    const base = randInt(10, 89);
    const apex = 180 - 2 * base;
    return {
      text: `An isosceles triangle has two equal angles of ${base} degrees each. What is the size of the third angle? _____ degrees`,
      answer: `${apex}`
    };
  },
  // ---- Square ----
  () => {
    return {
      text: `What is the size of each interior angle in a square? _____ degrees`,
      answer: "90"
    };
  },
  // ---- Rectangle ----
  () => {
    return {
      text: `What is the size of each interior angle in a rectangle? _____ degrees`,
      answer: "90"
    };
  },
  // ---- Parallelogram ----
  () => {
    const a = randInt(20, 160);
    return {
      text: `A parallelogram has an angle of ${a} degrees. What is the size of the angle right next to it? _____ degrees`,
      answer: `${180 - a}`
    };
  },
  // ---- Rhombus ----
  () => {
    const a = randInt(20, 160);
    return {
      text: `A parallelogram has an angle of ${a} degrees. What is the size of the angle opposite to it? _____ degrees`,
      answer: `${a}`
    };
  },
  // ---- Kite ----
  () => {
    const a = randInt(20, 140);
    const b = randInt(20, 90);
    const c = 360 - a - 2 * b;
    return {
      text: `A kite has the angle A, which is ${a} degrees and lies at the very top of the kite. The angle opposite to A (C) is ${c} degrees, down below. What is the size of angle B or D? _____ degrees`,
      answer: `${b}`
    };
  },
  // ---- Arrowhead (concave kite / dart) ----
  () => {
    const a = randInt(20, 60);
    const b = randInt(20, 50);
    const c = 360 - a - 2 * b; // reflex angle, guaranteed > 180 by the ranges above
    return {
      text: `An arrowhead (dart) shape has angle A = ${a} degrees. The two angles between the unequal sides (B and D) are equal, at ${b} degrees each. What is the size of the reflex angle C? _____ degrees`,
      answer: `${c}`
    };
  }
];

// ---- Topic 4: Angle facts ----
const t4_angleFacts = [
  () => {
    const facts = [
      ["Angles on a straight line add up to ___ degrees.", "180"],
      ["Angles around a point add up to ___ degrees.", "360"],
      ["Angles in a triangle add up to ___ degrees.", "180"],
      ["Angles in a quadrilateral add up to ___ degrees.", "360"],
      ["A right angle is ___ degrees.", "90"]
    ];
    const f = randChoice(facts);
    return { text: "Answer this fact: " + f[0], answer: f[1] };
  },
  () => {
    return {
      text: "Vertically opposite angles formed by two crossing lines are always: equal or add to 180 degrees?",
      answer: "equal"
    };
  }
];

// ---- Topic 5: Averages ----
const t5_averages = [
  () => {
    const length = randInt(3, 10);
    const type = randChoice(["mean", "median", "mode", "range"]);
    let nums;
    let modeValue;

    if (type === "mode") {
      // Build a list with a guaranteed, unambiguous mode value.
      modeValue = randInt(1, 20);
      const others = [];
      while (others.length < length - 2) {
        const v = randInt(1, 20);
        // must differ from modeValue AND from every other "other" already chosen,
        // otherwise we could accidentally create a second tied mode.
        if (v !== modeValue && !others.includes(v)) others.push(v);
      }
      nums = [modeValue, modeValue, ...others].sort(() => Math.random() - 0.5);
    } else {
      nums = [];
      for (let i = 0; i < length; i++) nums.push(randInt(1, 20));
    }

    if (type === "mean") {
      const sum = nums.reduce((s, n) => s + n, 0);
      const meanVal = Math.round((sum / nums.length) * 100) / 100;
      return {
        text: `Find the mean of ${nums.join(", ")}.`,
        answer: `${meanVal}`
      };
    }

    if (type === "median") {
      const sorted = [...nums].sort((a, b) => a - b);
      let med;
      if (sorted.length % 2 === 0) {
        // Even-length list: median is the midpoint of the two middle values.
        const mid1 = sorted[sorted.length / 2 - 1];
        const mid2 = sorted[sorted.length / 2];
        med = midpoint(mid1, mid2);
      } else {
        med = sorted[Math.floor(sorted.length / 2)];
      }
      return {
        text: `Find the median of ${nums.join(", ")}.`,
        answer: `${med}`
      };
    }

    if (type === "mode") {
      return {
        text: `Find the mode of ${nums.join(", ")}.`,
        answer: `${modeValue}`
      };
    }

    // type === "range"
    const range = Math.max(...nums) - Math.min(...nums);
    return {
      text: `Find the range of ${nums.join(", ")}.`,
      answer: `${range}`
    };
  },
  () => {
    const a = randInt(1, 100);
    const b = randInt(1, 100);
    return {
      text: `What is the midpoint of ${a} and ${b}?`,
      answer: `${midpoint(a, b)}`
    };
  }
];

// ---- Topic 6: Charts ----
const t6_charts = [
  // ---- Bar chart ----
  () => {
    const n = randInt(2, 5);
    const { theme, labels } = pickThemeCategories(n);
    const values = buildDistinctValues(n, 5, 29);
    const sum = values.reduce((a, b) => a + b, 0);
    const listStr = labels.map((l, i) => `${l}: ${values[i]}`).join(", ");
    const qType = randChoice(["total", "missing", "difference", "most", "least"]);

    if (qType === "total") {
      return {
        text: `A bar chart shows ${theme.phrase} each of these: ${listStr} (votes). What is the total number of votes?`,
        answer: `${sum}`
      };
    }
    if (qType === "missing") {
      const hideIdx = randInt(0, n - 1);
      const knownStr = labels
        .map((l, i) => (i === hideIdx ? null : `${l}: ${values[i]}`))
        .filter(Boolean)
        .join(", ");
      return {
        text: `A bar chart shows ${theme.phrase} each of these. ${knownStr}, and the total number of votes is ${sum}. How many votes did ${labels[hideIdx]} get?`,
        answer: `${values[hideIdx]}`
      };
    }
    if (qType === "difference") {
      let i = randInt(0, n - 1), j;
      do { j = randInt(0, n - 1); } while (j === i);
      return {
        text: `A bar chart shows ${theme.phrase} each of these: ${listStr}. What is the difference in votes between ${labels[i]} and ${labels[j]}?`,
        answer: `${Math.abs(values[i] - values[j])}`
      };
    }
    if (qType === "most") {
      const maxVal = Math.max(...values);
      return {
        text: `A bar chart shows ${theme.phrase} each of these: ${listStr}. Which category got the most votes? Name it exactly how the word is shown.`,
        answer: `${labels[values.indexOf(maxVal)]}`
      };
    }
    if (qType === "least") {
      const minVal = Math.min(...values);
      return {
        text: `A bar chart shows ${theme.phrase} each of these: ${listStr}. Which category got the least votes? Name it exactly how the word is shown.`,
        answer: `${labels[values.indexOf(minVal)]}`
      };
    }
  },

  // ---- Pie chart ----
  () => {
    const n = randInt(2, 5);
    const minFeasibleT = (n * (n + 1)) / 2; // smallest possible sum of n distinct positive integers
    const T = randChoice([10, 20, 25, 50].filter(t => t >= minFeasibleT));
    const { theme, labels } = pickThemeCategories(n);
    const step = 100 / T;

    let values;
    do {
      values = Array(n).fill(1);
      let remaining = T - n;
      while (remaining > 0) {
        values[randInt(0, n - 1)]++;
        remaining--;
      }
    } while (new Set(values).size !== n);

    const percentages = values.map(v => v * step);
    const listStr = labels.map((l, i) => `${l}: ${values[i]} votes (${percentages[i]}%)`).join(", ");
    const qType = randChoice(["total", "missingAmount", "percentOfOne", "differenceAmount", "differencePercent", "most", "least", "angle"]);

    if (qType === "total") {
      const sub = randChoice(["votes", "percent"]);
      if (sub === "votes") {
        return {
          text: `A pie chart shows ${theme.phrase} each of these: ${listStr}. What is the total number of votes?`,
          answer: `${T}`
        };
      }
      return {
        text: `A pie chart shows ${theme.phrase} each of these: ${listStr}. What do all the percentages add up to?`,
        answer: "100%"
      };
    }
    if (qType === "missingAmount") {
      const hideIdx = randInt(0, n - 1);
      const knownStr = labels
        .map((l, i) => (i === hideIdx ? null : `${l}: ${values[i]} votes (${percentages[i]}%)`))
        .filter(Boolean)
        .join(", ");
      return {
        text: `A pie chart shows ${theme.phrase} each of these. ${knownStr}, and the total number of votes is ${T}. How many votes did ${labels[hideIdx]} get?`,
        answer: `${values[hideIdx]}`
      };
    }
    if (qType === "percentOfOne") {
      const idx = randInt(0, n - 1);
      const knownStr = labels.map((l, i) => `${l}: ${values[i]} votes`).join(", ");
      return {
        text: `A pie chart shows ${theme.phrase} each of these out of a total of ${T} votes: ${knownStr}. What percentage of the total does ${labels[idx]} represent?`,
        answer: `${percentages[idx]}%`
      };
    }
    if (qType === "differenceAmount") {
      let i = randInt(0, n - 1), j;
      do { j = randInt(0, n - 1); } while (j === i);
      return {
        text: `A pie chart shows ${theme.phrase} each of these: ${listStr}. What is the difference in votes between ${labels[i]} and ${labels[j]}?`,
        answer: `${Math.abs(values[i] - values[j])}`
      };
    }
    if (qType === "differencePercent") {
      let i = randInt(0, n - 1), j;
      do { j = randInt(0, n - 1); } while (j === i);
      return {
        text: `A pie chart shows ${theme.phrase} each of these: ${listStr}. What is the difference in percentage between ${labels[i]} and ${labels[j]}?`,
        answer: `${Math.abs(percentages[i] - percentages[j])}%`
      };
    }
    if (qType === "most") {
      const maxVal = Math.max(...values);
      return {
        text: `A pie chart shows ${theme.phrase} each of these: ${listStr}. Which category got the most votes? Name it exactly how the word is shown.`,
        answer: `${labels[values.indexOf(maxVal)]}`
      };
    }
    if (qType === "least") {
      const minVal = Math.min(...values);
      return {
        text: `A pie chart shows ${theme.phrase} each of these: ${listStr}. Which category got the least votes? Name it exactly how the word is shown.`,
        answer: `${labels[values.indexOf(minVal)]}`
      };
    }
    // angle
    const idx = randInt(0, n - 1);
    const angle = Math.round((values[idx] / T) * 360 * 10) / 10;
    return {
      text: `A pie chart shows ${theme.phrase} each of these: ${listStr}. What is the angle of the slice for ${labels[idx]} (degrees, to 1 decimal place if needed)?`,
      answer: `${angle}`
    };
  },

  // ---- Frequency table (advanced average questions) ----
  () => {
    const n = randInt(3, 5);
    const valuesPool = [];
    while (valuesPool.length < n) {
      const v = randInt(1, 12);
      if (!valuesPool.includes(v)) valuesPool.push(v);
    }
    valuesPool.sort((a, b) => a - b);

    let freqs;
    do {
      freqs = valuesPool.map(() => randInt(1, 9));
    } while (new Set(freqs).size !== freqs.length); // unique frequencies => unique, unambiguous mode

    const totalEntries = freqs.reduce((a, b) => a + b, 0);
    const tableStr = valuesPool.map((v, i) => `value ${v} occurs ${freqs[i]} times`).join(", ");
    const qType = randChoice(["mean", "mode", "total", "median"]);

    if (qType === "mean") {
      const weightedSum = valuesPool.reduce((s, v, i) => s + v * freqs[i], 0);
      const mean = Math.round((weightedSum / totalEntries) * 100) / 100;
      return {
        text: `A frequency table shows: ${tableStr}. What is the mean of this data (to 2 decimal places if needed)?`,
        answer: `${mean}`
      };
    }
    if (qType === "mode") {
      const maxFreq = Math.max(...freqs);
      return {
        text: `A frequency table shows: ${tableStr}. What is the mode of this data?`,
        answer: `${valuesPool[freqs.indexOf(maxFreq)]}`
      };
    }
    if (qType === "total") {
      return {
        text: `A frequency table shows: ${tableStr}. How many pieces of data are there in total?`,
        answer: `${totalEntries}`
      };
    }
    // median via frequency table
    const expanded = [];
    valuesPool.forEach((v, i) => { for (let k = 0; k < freqs[i]; k++) expanded.push(v); });
    expanded.sort((a, b) => a - b);
    let median;
    if (expanded.length % 2 === 0) {
      median = midpoint(expanded[expanded.length / 2 - 1], expanded[expanded.length / 2]);
    } else {
      median = expanded[Math.floor(expanded.length / 2)];
    }
    return {
      text: `A frequency table shows: ${tableStr}. What is the median of this data?`,
      answer: `${median}`
    };
  },

  // ---- Pictogram ----
  () => {
    const K = randChoice([2, 4, 5, 8, 10, 15]);
    const fracOptions = [0];
    if (K % 2 === 0) fracOptions.push(0.5);
    if (K % 3 === 0) { fracOptions.push(1 / 3); fracOptions.push(2 / 3); }

    const n = randInt(2, 5);
    const { theme, labels } = pickThemeCategories(n);

    function fracLabel(f) {
      if (f === 0) return "";
      if (f === 0.5) return " + 1/2 symbol";
      if (Math.abs(f - 1 / 3) < 1e-9) return " + 1/3 symbol";
      if (Math.abs(f - 2 / 3) < 1e-9) return " + 2/3 symbol";
      return "";
    }

    let wholeSymbols, fracs, values;
    do {
      wholeSymbols = [];
      fracs = [];
      for (let i = 0; i < n; i++) {
        wholeSymbols.push(randInt(1, 6));
        fracs.push(randChoice(fracOptions));
      }
      values = wholeSymbols.map((w, i) => Math.round((w + fracs[i]) * K));
    } while (new Set(values).size !== n);

    const total = values.reduce((a, b) => a + b, 0);
    const listStr = labels
      .map((l, i) => `${l}: ${wholeSymbols[i]} symbol${wholeSymbols[i] === 1 ? "" : "s"}${fracLabel(fracs[i])}`)
      .join(", ");
    const qType = randChoice(["total", "missing", "difference", "most", "least", "findKey"]);

    if (qType === "total") {
      return {
        text: `A pictogram has a key: 1 person symbol = ${K} votes. It shows ${theme.phrase} each of these: ${listStr}. What is the total number of votes?`,
        answer: `${total}`
      };
    }
    if (qType === "missing") {
      const hideIdx = randInt(0, n - 1);
      const knownStr = labels
        .map((l, i) => (i === hideIdx ? null : `${l}: ${values[i]} votes`))
        .filter(Boolean)
        .join(", ");
      return {
        text: `A pictogram has a key: 1 person symbol = ${K} votes. It shows ${theme.phrase} each of these. ${knownStr}, and the total number of votes is ${total}. How many votes did ${labels[hideIdx]} get?`,
        answer: `${values[hideIdx]}`
      };
    }
    if (qType === "difference") {
      let i = randInt(0, n - 1), j;
      do { j = randInt(0, n - 1); } while (j === i);
      return {
        text: `A pictogram has a key: 1 person symbol = ${K} votes. It shows ${theme.phrase} each of these: ${listStr}. What is the difference in votes between ${labels[i]} and ${labels[j]}?`,
        answer: `${Math.abs(values[i] - values[j])}`
      };
    }
    if (qType === "most") {
      const maxVal = Math.max(...values);
      return {
        text: `A pictogram has a key: 1 person symbol = ${K} votes. It shows ${theme.phrase} each of these: ${listStr}. Which category got the most votes? Name it exactly how the word is shown.`,
        answer: `${labels[values.indexOf(maxVal)]}`
      };
    }
    if (qType === "least") {
      const minVal = Math.min(...values);
      return {
        text: `A pictogram has a key: 1 person symbol = ${K} votes. It shows ${theme.phrase} each of these: ${listStr}. Which category got the least votes? Name it exactly how the word is shown.`,
        answer: `${labels[values.indexOf(minVal)]}`
      };
    }
    // findKey: reveal one category's plain whole-symbol count without the key, deduce K from total
    let idx = wholeSymbols.findIndex((w, i) => fracs[i] === 0);
    if (idx === -1) {
      idx = randInt(0, n - 1);
      fracs[idx] = 0;
      values[idx] = wholeSymbols[idx] * K;
    }
    const otherStr = labels
      .map((l, i) => (i === idx ? null : `${l}: ${values[i]} votes`))
      .filter(Boolean)
      .join(", ");
    const newTotal = values.reduce((a, b) => a + b, 0);
    return {
      text: `A pictogram shows ${theme.phrase} each of these. The key is missing. ${otherStr}, ${labels[idx]} has ${wholeSymbols[idx]} symbol${wholeSymbols[idx] === 1 ? "" : "s"} (unlabeled), and the total number of votes is ${newTotal}. How many votes does each symbol represent?`,
      answer: `${K}`
    };
  }
];

// ---- Topic 7: Convert (Fractions, Decimals, Percentages) ----
const t7_convert = [
  // decimal -> percentage
  () => {
    const { num, den } = randSimplifiedFraction();
    const decimal = fractionToDecimal(num, den);
    const percent = fractionToPercent(num, den);
    return {
      text: `Convert ${decimal} into a percentage.`,
      answer: `${percent}%`
    };
  },
  // fraction -> percentage
  () => {
    const { num, den } = randSimplifiedFraction();
    const percent = fractionToPercent(num, den);
    return {
      text: `Convert ${num}/${den} into a percentage.`,
      answer: `${percent}%`
    };
  },
  // decimal -> fraction
  () => {
    const { num, den } = randSimplifiedFraction();
    const decimal = fractionToDecimal(num, den);
    return {
      text: `Convert ${decimal} into a fraction in its simplest form.`,
      answer: `${num}/${den}`
    };
  },
  // percentage -> fraction
  () => {
    const { num, den } = randSimplifiedFraction();
    const percent = fractionToPercent(num, den);
    return {
      text: `Convert ${percent}% into a fraction in its simplest form.`,
      answer: `${num}/${den}`
    };
  },
  // fraction -> decimal
  () => {
    const { num, den } = randSimplifiedFraction();
    const decimal = fractionToDecimal(num, den);
    return {
      text: `Convert ${num}/${den} into a decimal.`,
      answer: `${decimal}`
    };
  },
  // percentage -> decimal
  () => {
    const { num, den } = randSimplifiedFraction();
    const percent = fractionToPercent(num, den);
    const decimal = fractionToDecimal(num, den);
    return {
      text: `Convert ${percent}% into a decimal.`,
      answer: `${decimal}`
    };
  }
];

// ---- Topic 8: Expand and simplify ----
const t8_expand = [
  () => {
    const outsideIsLetter = Math.random() < 0.5;
    const outside = outsideIsLetter
      ? { kind: "letter", value: randLetter() }
      : { kind: "number", value: randInt(2, 9) };

    // 2 terms: 1 letter + 1 number, random order. (The harder 3-term,
    // 2-distinct-letter version of this now lives in Hard Topic 8 instead,
    // so Normal's algebra stays at one consistent difficulty level.)
    const letter = randLetter();
    const number = randInt(1, 12);
    const order = Math.random() < 0.5 ? ["letter", "number"] : ["number", "letter"];
    const terms = order.map((k, idx) => ({
      sign: idx === 0 ? 1 : (Math.random() < 0.5 ? 1 : -1),
      kind: k,
      value: k === "letter" ? letter : number
    }));

    const insideStr = terms
      .map((t, idx) => {
        const valStr = t.kind === "letter" ? t.value : `${t.value}`;
        if (idx === 0) return valStr;
        return (t.sign > 0 ? " + " : " - ") + valStr;
      })
      .join("");

    const outsideStr = outside.kind === "letter" ? outside.value : `${outside.value}`;

    const answer = terms
      .map((t, idx) => {
        const monomial = letterTimes(outside, { kind: t.kind, value: t.value });
        if (idx === 0) return monomial;
        return (t.sign > 0 ? "+" : "-") + monomial;
      })
      .join("");

    return {
      text: `Expand ${outsideStr}(${insideStr}). If a term is squared, write it like x^2 (using ^2 for the small "squared" 2).`,
      answer: `${answer}`
    };
  }
];

// ---- Topic 9: Find X ----
const t9_findX = [
  () => {
    const opPrimary = randChoice(["*", "/"]);
    const opSecondary = randChoice(["+", "-"]);
    const bracketed = Math.random() < 0.5;
    let A, B, C, R;

    if (!bracketed) {
      // Standard precedence: (A op1 B) op2 C = R
      let mid;
      if (opPrimary === "*") {
        A = randInt(2, 12);
        B = randInt(2, 12);
        mid = A * B;
      } else {
        B = randInt(2, 12);
        const quotient = randInt(2, 12);
        A = B * quotient;
        mid = quotient;
      }
      if (opSecondary === "+") {
        C = randInt(1, 20);
        R = mid + C;
      } else {
        C = randInt(1, Math.max(1, mid - 1));
        R = mid - C;
      }
    } else {
      // Bracketed: A op1 (B op2 C) = R — forces the add/subtract to happen first
      B = randInt(2, 15);
      let inner;
      if (opSecondary === "+") {
        C = randInt(1, 15);
        inner = B + C;
      } else {
        C = randInt(1, Math.max(1, B - 1));
        inner = B - C;
      }
      if (inner < 1) inner = 1;
      if (opPrimary === "*") {
        A = randInt(2, 12);
        R = A * inner;
      } else {
        const quotient = randInt(2, 12);
        A = inner * quotient;
        R = quotient;
      }
    }

    const letter = randChoice("abcdefghijklmnopqrstuvwyz".split("")); // 'x' excluded: collides with the multiplication symbol
    const hiddenSlot = randChoice(["A", "B", "C"]);
    const values = { A, B, C };
    const answer = values[hiddenSlot];

    const display = key => (key === hiddenSlot ? letter : `${values[key]}`);
    const symbol = op => (op === "*" ? "x" : op);

    const expression = bracketed
      ? `${display("A")} ${symbol(opPrimary)} (${display("B")} ${symbol(opSecondary)} ${display("C")})`
      : `${display("A")} ${symbol(opPrimary)} ${display("B")} ${symbol(opSecondary)} ${display("C")}`;

    return {
      text: `Find the value of ${letter}: ${expression} = ${R}`,
      answer: `${answer}`
    };
  }
];

// ---- Topic 10: Like terms ----
const t10_likeTerms = [
  () => {
    const a = randInt(1, 10);
    const b = randInt(1, 10);
    const letter = randLetter();
    return {
      text: `Simplify: ${a}${letter} + ${b}${letter}`,
      answer: `${a + b}${letter}`
    };
  },
  () => {
    const a = randInt(5, 15);
    const b = randInt(1, 4);
    const letter = randLetter();
    return {
      text: `Simplify: ${a}${letter} - ${b}${letter}`,
      answer: formatLeadCoeff(a - b, letter)
    };
  }
];

// ---- Topic 11: Multiply decimals ----
function randTenths() {
  return randInt(1, 9) / 10;
}

function randHundredthsAndTenths() {
  // 2 decimal places, with both the tenths digit and hundredths digit non-zero
  const tenthsDigit = randInt(1, 9);
  const hundredthsDigit = randInt(1, 9);
  return (tenthsDigit * 10 + hundredthsDigit) / 100;
}

const t11_multiplyDecimals = [
  () => {
    const caseType = randChoice(["tt", "th", "ht", "hh"]);
    let a, b;
    if (caseType === "tt") {
      a = randTenths();
      b = randTenths();
    } else if (caseType === "th") {
      a = randTenths();
      b = randHundredthsAndTenths();
    } else if (caseType === "ht") {
      a = randHundredthsAndTenths();
      b = randTenths();
    } else {
      a = randHundredthsAndTenths();
      b = randHundredthsAndTenths();
    }
    const result = Math.round(a * b * 10000) / 10000;
    return {
      text: `What is ${a} x ${b}?`,
      answer: `${result}`
    };
  }
];

// ---- Topic 12: Percentage of ----
const t12_percentOf = [
  () => {
    const percent = randChoice([1, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);
    const total = randChoice([20, 50, 100, 200, 400, 500, 1000, 2000, 4000, 5000, 10000]);
    const result = Math.round((percent / 100) * total * 10000) / 10000;
    return {
      text: `What is ${percent}% of ${total}?`,
      answer: `${result}`
    };
  }
];

// ---- Topic 14: Powers and roots ----
const t14_powersRoots = [
  () => {
    const mode = randChoice(["power", "root"]);

    if (mode === "root") {
      const base = randInt(2, 20);
      return {
        text: `What is the square root of ${base * base}?`,
        answer: `${base}`
      };
    }

    // mode === "power"
    const isSquare = Math.random() < 0.5;
    if (isSquare) {
      const base = randInt(2, 20);
      return {
        text: `What is ${base} squared?`,
        answer: `${base * base}`
      };
    }
    const base = randInt(2, 10);
    const exponent = randInt(3, 5);
    return {
      text: `What is ${base} to the power of ${exponent}?`,
      answer: `${Math.pow(base, exponent)}`
    };
  }
];

// ---- Topic 15: Prime Numbers & Factors and LCM & HCF ----
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

function nextPrimeAfter(n) {
  let candidate = n + 1;
  while (!isPrime(candidate)) candidate++;
  return candidate;
}

function countFactors(n) {
  let count = 0;
  for (let i = 1; i <= n; i++) if (n % i === 0) count++;
  return count;
}

const SMALL_FACTORS = [2, 3, 5, 7, 8, 9, 10, 12, 15, 16, 20];
const BIG_FACTORS = [35, 40, 50, 56, 60, 61, 63, 72, 80, 90, 100, 101, 121, 144, 169, 180];
const HCF_EXTRA = [18, 30, 40, 50];
const LCM_POOL = [3, 5, 6, 7, 8, 10, 12, 15, 16, 20, 25, 30];

// "a PRIME NUMBER is a NUMBER only DIVISIBLE by ONE and ITSELF"
// capitalized words above are the ones eligible to be blanked out.
const PRIME_DEF_TOKENS = ["a", "prime", "number", "is", "a", "number", "only", "divisible", "by", "one", "and", "itself"];
const PRIME_DEF_BLANKABLE = [1, 2, 5, 7, 9, 11];

const t15_primesFactors = [
  () => {
    const category = randChoice(["prime", "factor", "hcf", "lcm"]);

    if (category === "prime") {
      const subType = randChoice(["isPrime", "nextPrime", "calcPrime", "definition"]);

      if (subType === "isPrime") {
        const n = randInt(1, 100);
        return {
          text: `Is ${n} a prime number? Answer yes or no.`,
          answer: isPrime(n) ? "yes" : "no"
        };
      }

      if (subType === "nextPrime") {
        const n = randInt(1, 96);
        return {
          text: `What is the next prime number you can find after ${n}?`,
          answer: `${nextPrimeAfter(n)}`
        };
      }

      if (subType === "calcPrime") {
        const op = randChoice(["+", "-", "*", "/"]);
        let a, b, result;
        if (op === "+") {
          a = randInt(2, 50); b = randInt(2, 50); result = a + b;
        } else if (op === "-") {
          a = randInt(10, 80); b = randInt(2, Math.min(60, a - 1)); result = a - b;
        } else if (op === "*") {
          a = randInt(2, 12); b = randInt(2, 12); result = a * b;
        } else {
          b = randInt(2, 12);
          const quotient = randInt(2, 12);
          a = b * quotient;
          result = quotient;
        }
        const symbol = op === "*" ? "x" : op;
        return {
          text: `Is this calculation prime? Answer yes or no exactly. ${a} ${symbol} ${b}`,
          answer: isPrime(result) ? "yes" : "no"
        };
      }

      // definition
      const blankIdx = randChoice(PRIME_DEF_BLANKABLE);
      const answer = PRIME_DEF_TOKENS[blankIdx];
      const sentence = PRIME_DEF_TOKENS
        .map((word, idx) => (idx === blankIdx ? "_____" : word))
        .join(" ");
      return {
        text: `Fill in the blank: ${sentence}`,
        answer: answer
      };
    }

    if (category === "factor") {
      const subType = randChoice(["isFactor", "howManyFactors"]);

      if (subType === "isFactor") {
        const small = randChoice(SMALL_FACTORS);
        const big = randChoice(BIG_FACTORS);
        return {
          text: `Is ${small} a factor of ${big}? Answer yes or no.`,
          answer: big % small === 0 ? "yes" : "no"
        };
      }

      // howManyFactors
      const pool = BIG_FACTORS.concat([12, 15, 18, 24, 30]);
      const n = randChoice(pool);
      return {
        text: `How many factors does ${n} have?`,
        answer: `${countFactors(n)}`
      };
    }

    if (category === "hcf") {
      const pool = SMALL_FACTORS.concat(HCF_EXTRA);
      const a = randChoice(pool);
      const b = randChoice(pool);
      return {
        text: `What is the HCF (highest common factor) of ${a} and ${b}?`,
        answer: `${gcd(a, b)}`
      };
    }

    // category === "lcm"
    const a = randChoice(LCM_POOL);
    const b = randChoice(LCM_POOL);
    return {
      text: `What is the LCM (lowest common multiple) of ${a} and ${b}?`,
      answer: `${(a * b) / gcd(a, b)}`
    };
  }
];

// ---- Topic 16: Ratio ----
const RATIO_THEMES = [
  { unit: "sweets", a: "Amy", b: "Ben" },
  { unit: "marbles", a: "Sam", b: "Jess" },
  { unit: "pounds", a: "Tom", b: "Jerry" },
  { unit: "stickers", a: "Mia", b: "Leo" }
];

function buildRatioScenario() {
  const theme = randChoice(RATIO_THEMES);
  const a = randInt(1, 9);
  const b = randInt(1, 9);
  const scale = randInt(2, 10);
  const val1 = a * scale;
  const val2 = b * scale;
  const total = val1 + val2;
  return { theme, a, b, val1, val2, total };
}

const t16_ratio = [
  () => {
    const subType = randChoice(["sharing", "simplifying", "total", "missing", "difference"]);

    if (subType === "sharing") {
      const { theme, a, b, val1, val2, total } = buildRatioScenario();
      const askA = Math.random() < 0.5;
      const who = askA ? theme.a : theme.b;
      const answer = askA ? val1 : val2;
      return {
        text: `${theme.a} and ${theme.b} share ${total} ${theme.unit} in the ratio ${a}:${b}. How many ${theme.unit} does ${who} get?`,
        answer: `${answer}`
      };
    }

    if (subType === "simplifying") {
      let a, b;
      do {
        a = randInt(1, 9);
        b = randInt(1, 9);
      } while (gcd(a, b) !== 1);
      const scale = randInt(2, 9);
      const scaledA = a * scale;
      const scaledB = b * scale;
      return {
        text: `Simplify the ratio ${scaledA}:${scaledB} to its simplest form.`,
        answer: `${a}:${b}`
      };
    }

    if (subType === "total") {
      const { theme, a, b, val1, val2, total } = buildRatioScenario();
      return {
        text: `${theme.a} and ${theme.b} share ${theme.unit} in the ratio ${a}:${b}. ${theme.a} gets ${val1} ${theme.unit} and ${theme.b} gets ${val2} ${theme.unit}. What is the total number of ${theme.unit} shared?`,
        answer: `${total}`
      };
    }

    if (subType === "missing") {
      const { theme, a, b, val1, val2, total } = buildRatioScenario();
      const giveA = Math.random() < 0.5;
      const knownPerson = giveA ? theme.a : theme.b;
      const knownVal = giveA ? val1 : val2;
      const missingPerson = giveA ? theme.b : theme.a;
      const missingVal = giveA ? val2 : val1;
      return {
        text: `${theme.a} and ${theme.b} share ${theme.unit} in the ratio ${a}:${b}. The total is ${total} ${theme.unit}. ${knownPerson} gets ${knownVal} ${theme.unit}. How many ${theme.unit} does ${missingPerson} get?`,
        answer: `${missingVal}`
      };
    }

    // difference
    const { theme, a, b, val1, val2, total } = buildRatioScenario();
    return {
      text: `${theme.a} and ${theme.b} share ${theme.unit} in the ratio ${a}:${b}. The total is ${total} ${theme.unit}. What is the difference between the amount ${theme.a} gets and the amount ${theme.b} gets?`,
      answer: `${Math.abs(val1 - val2)}`
    };
  }
];

// ---- Topic 17: Recurring decimal into fraction ----
const t17_recurring = [
  // single-digit recurring: 0.ddd... = d/9
  () => {
    const d = randInt(1, 8);
    return {
      text: `Convert the recurring decimal 0.${d}${d}${d}... into a fraction in its simplest form.`,
      answer: `${simplifyFraction(d, 9).join("/")}`
    };
  },
  // two-digit recurring: 0.ababab... = ab/99
  () => {
    let num;
    do { num = randInt(10, 98); } while (num % 11 === 0 && gcd(num, 99) === 11); // avoid trivial already-unit fractions
    const [sn, sd] = simplifyFraction(num, 99);
    const d1 = String(num).padStart(2, "0")[0];
    const d2 = String(num).padStart(2, "0")[1];
    return {
      text: `Convert the recurring decimal 0.${d1}${d2}${d1}${d2}... into a fraction in its simplest form.`,
      answer: `${sn}/${sd}`
    };
  },
  // three-digit recurring: 0.abcabc... = abc/999
  () => {
    let num;
    do { num = randInt(100, 998); } while (gcd(num, 999) === num); // avoid degenerate cases
    const [sn, sd] = simplifyFraction(num, 999);
    const str = String(num).padStart(3, "0");
    return {
      text: `Convert the recurring decimal 0.${str}${str}... into a fraction in its simplest form.`,
      answer: `${sn}/${sd}`
    };
  },
  // reverse: fraction with denominator 9/99 -> recurring decimal notation
  () => {
    const denChoice = randChoice([9, 99]);
    const maxNum = denChoice - 1;
    let num;
    do { num = randInt(1, maxNum); } while (gcd(num, denChoice) !== 1);
    if (denChoice === 9) {
      return {
        text: `Write ${num}/${denChoice} as a recurring decimal. Use the format 0.ddd...`,
        answer: `0.${num}${num}${num}...`
      };
    }
    const str = String(num).padStart(2, "0");
    return {
      text: `Write ${num}/${denChoice} as a recurring decimal. Use the format 0.ddd...`,
      answer: `0.${str}${str}...`
    };
  }
];

// ---- Topic 18: Simplifying (fractions) ----
const t18_simplifying = [
  // basic: simplify a fraction (small numbers)
  () => {
    const g = randInt(2, 9);
    const num = randInt(1, 9) * g;
    const den = randInt(num / g + 1, 12) * g;
    const [sn, sd] = simplifyFraction(num, den);
    return {
      text: `Simplify the fraction ${num}/${den}.`,
      answer: `${sn}/${sd}`
    };
  },
  // larger numbers using prime factors 7, 11, 13
  () => {
    const prime = randChoice([7, 11, 13]);
    const num = randInt(1, 6) * prime;
    const den = randInt(num / prime + 1, 9) * prime;
    const [sn, sd] = simplifyFraction(num, den);
    return {
      text: `Simplify the fraction ${num}/${den}.`,
      answer: `${sn}/${sd}`
    };
  },
  // is it already simplified? yes or no
  () => {
    const alreadySimple = Math.random() < 0.5;
    let num, den;
    if (alreadySimple) {
      do {
        num = randInt(1, 15);
        den = randInt(num + 1, 20);
      } while (gcd(num, den) !== 1);
      return {
        text: `Is the fraction ${num}/${den} already in its simplest form? Answer yes or no.`,
        answer: "yes"
      };
    }
    const g = randInt(2, 6);
    num = randInt(1, 8) * g;
    den = randInt(num / g + 1, 10) * g;
    return {
      text: `Is the fraction ${num}/${den} already in its simplest form? Answer yes or no.`,
      answer: "no"
    };
  },
  // order two fractions: smallest to largest
  () => {
    let denA, denB, numA, numB;
    do {
      denA = randChoice([2, 3, 4, 5, 6, 8, 10]);
      denB = randChoice([2, 3, 4, 5, 6, 8, 10]);
      numA = randInt(1, denA - 1);
      numB = randInt(1, denB - 1);
    } while (Math.abs(numA / denA - numB / denB) < 1e-9); // retry if equal
    const valA = numA / denA;
    const valB = numB / denB;
    const ordered = valA < valB
      ? `${numA}/${denA}, ${numB}/${denB}`
      : `${numB}/${denB}, ${numA}/${denA}`;
    return {
      text: `Put these fractions in order from smallest to largest: ${numA}/${denA}, ${numB}/${denB}`,
      answer: ordered
    };
  },
  // add two fractions with the same denominator
  () => {
    const den = randChoice([3, 4, 5, 6, 8, 10, 12]);
    const numA = randInt(1, den - 2);
    const numB = randInt(1, den - numA - 1);
    const sumNum = numA + numB;
    const [sn, sd] = simplifyFraction(sumNum, den);
    return {
      text: `Calculate ${numA}/${den} + ${numB}/${den}. Simplify your answer if possible.`,
      answer: `${sn}/${sd}`
    };
  },
  // add two fractions with different denominators (one is a multiple of the other)
  () => {
    const denA = randChoice([2, 3, 4, 5]);
    const mult = randChoice([2, 3, 4]).valueOf();
    const denB = denA * mult;
    const numA = randInt(1, denA - 1);
    const numB = randInt(1, denB - 1);
    const sumNum = numA * mult + numB;
    const sumDen = denB;
    const [sn, sd] = simplifyFraction(sumNum, sumDen);
    return {
      text: `Calculate ${numA}/${denA} + ${numB}/${denB}. Simplify your answer if possible.`,
      answer: `${sn}/${sd}`
    };
  }
];

// ---- Topic 19: X-axis, Y-axis (coordinates) ----
const t19_axes = [
  // x-coordinate
  () => {
    const x = randInt(-10, 10);
    const y = randInt(-10, 10);
    return {
      text: `A point is at (${x}, ${y}). What is its x-coordinate?`,
      answer: `${x}`
    };
  },
  // y-coordinate
  () => {
    const x = randInt(-10, 10);
    const y = randInt(-10, 10);
    return {
      text: `A point is at (${x}, ${y}). What is its y-coordinate?`,
      answer: `${y}`
    };
  },
  // which quadrant?
  () => {
    const x = randChoice([-1, 1]) * randInt(1, 10);
    const y = randChoice([-1, 1]) * randInt(1, 10);
    let quadrant;
    if (x > 0 && y > 0) quadrant = "1st";
    else if (x < 0 && y > 0) quadrant = "2nd";
    else if (x < 0 && y < 0) quadrant = "3rd";
    else quadrant = "4th";
    return {
      text: `A point is at (${x}, ${y}). Which quadrant is it in? (1st, 2nd, 3rd or 4th)`,
      answer: quadrant
    };
  },
  // lies on which axis, or neither?
  () => {
    const caseType = randChoice(["x-axis", "y-axis", "neither"]);
    let x, y;
    if (caseType === "x-axis") { x = randChoice([-1,1]) * randInt(1, 10); y = 0; }
    else if (caseType === "y-axis") { x = 0; y = randChoice([-1,1]) * randInt(1, 10); }
    else { x = randChoice([-1,1]) * randInt(1, 10); y = randChoice([-1,1]) * randInt(1, 10); }
    return {
      text: `A point is at (${x}, ${y}). Does it lie on the x-axis, the y-axis, or neither?`,
      answer: caseType
    };
  },
  // midpoint of two coordinates
  () => {
    const x1 = randInt(-10, 10);
    const y1 = randInt(-10, 10);
    const x2 = randInt(-10, 10);
    const y2 = randInt(-10, 10);
    const mx = midpoint(x1, x2);
    const my = midpoint(y1, y2);
    return {
      text: `What is the midpoint of the points (${x1}, ${y1}) and (${x2}, ${y2})?`,
      answer: `(${mx}, ${my})`
    };
  },
  // distance between two points on the same axis
  () => {
    const axis = randChoice(["x", "y"]);
    const fixed = randInt(-5, 5);
    const a = randInt(-10, 10);
    const b = randInt(-10, 10);
    const dist = Math.abs(a - b);
    const p1 = axis === "x" ? `(${a}, ${fixed})` : `(${fixed}, ${a})`;
    const p2 = axis === "x" ? `(${b}, ${fixed})` : `(${fixed}, ${b})`;
    return {
      text: `What is the distance between the points ${p1} and ${p2}?`,
      answer: `${dist}`
    };
  },
  // which coordinate is further from the origin?
  () => {
    const x = randChoice([-1,1]) * randInt(1, 10);
    const y = randChoice([-1,1]) * randInt(1, 10);
    if (Math.abs(x) === Math.abs(y)) {
      return {
        text: `A point is at (${x}, ${y}). Are the x and y coordinates equal distances from the origin? Answer yes or no.`,
        answer: "yes"
      };
    }
    const further = Math.abs(x) > Math.abs(y) ? "x" : "y";
    return {
      text: `A point is at (${x}, ${y}). Which coordinate is further from the origin, x or y?`,
      answer: further
    };
  }
];

// ---- assemble Normal ----
questions.normal = [
  t1_primary,
  t2_algNotation,
  t3_angleCalc,
  t4_angleFacts,
  t5_averages,
  t6_charts,
  t7_convert,
  t8_expand,
  t9_findX,
  t10_likeTerms,
  t11_multiplyDecimals,
  t12_percentOf,
  t14_powersRoots,
  t15_primesFactors,
  t16_ratio,
  t17_recurring,
  t18_simplifying,
  t19_axes
];

// ============================================================
// RANDOM QUESTION EXTRACTOR
// ============================================================
// Picks a random topic from the given difficulty, then a random
// template within that topic, then generates a fresh question.
function getRandomQuestion(difficulty) {
  const topics = questions[difficulty];
  if (!topics || topics.length === 0) {
    throw new Error(`No topics loaded for difficulty: ${difficulty}`);
  }
  const topic = randChoice(topics);
  if (!topic || topic.length === 0) {
    throw new Error(`Topic has no templates for difficulty: ${difficulty}`);
  }
  const template = randChoice(topic);
  return template();
}

// ============================================================
// HARD — Same Green topics, harder variants
// ============================================================

// ---- Hard Topic 1: Primary — negative numbers, long mult/div, 4-number BIDMAS ----
const h1_primary = [
  () => {
    const a = randInt(100, 9999);
    const b = randInt(2, 12);
    return {
      text: `What is ${a} x ${b}?`,
      answer: `${a * b}`
    };
  },
  () => {
    const b = randInt(2, 12);
    const result = randInt(100, 999);
    const a = b * result;
    return {
      text: `What is ${a} / ${b}?`,
      answer: `${result}`
    };
  },
  () => {
    const a = randInt(-50, -1);
    const b = randInt(-50, -1);
    return {
      text: `What is ${a} + ${b}?`,
      answer: `${a + b}`
    };
  },
  () => {
    const a = randInt(-50, 50);
    const b = randInt(-50, 50);
    return {
      text: `What is ${a} - ${b}?`,
      answer: `${a - b}`
    };
  },
  () => {
    const a = randInt(-12, 12);
    const b = randInt(-12, 12);
    return {
      text: `What is ${a} x ${b}?`,
      answer: `${a * b}`
    };
  },
  // 4-number BIDMAS chain
  () => {
    const a = randInt(2, 10);
    const b = randInt(2, 10);
    const c = randInt(2, 10);
    const d = randInt(1, 10);
    return {
      text: `What is ${a} + ${b} x ${c} - ${d}? (remember BIDMAS)`,
      answer: `${a + b * c - d}`
    };
  },
  () => {
    const a = randInt(2, 8);
    const b = randInt(2, 8);
    const c = randInt(2, 8);
    const d = randInt(2, 8);
    return {
      text: `What is (${a} + ${b}) x (${c} + ${d})? (remember BIDMAS)`,
      answer: `${(a + b) * (c + d)}`
    };
  },
  () => {
    const b = randInt(2, 6);
    const cResult = randInt(2, 8);
    const c = b * cResult;
    const a = randInt(2, 10);
    const d = randInt(1, 10);
    return {
      text: `What is ${a} + ${c} / ${b} - ${d}? (remember BIDMAS)`,
      answer: `${a + c / b - d}`
    };
  }
];

// ---- Hard Topic 2: Algebraic notation — two variables, squared terms, combined ----
const h2_algNotation = [
  () => {
    const l1 = randLetter();
    let l2; do { l2 = randLetter(); } while (l2 === l1);
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    return {
      text: `Write ${a} times ${l1} added to ${b} times ${l2} in algebraic notation.`,
      answer: `${a}${l1}+${b}${l2}`
    };
  },
  () => {
    const letter = randLetter();
    return {
      text: `Write ${letter} squared in algebraic notation. Use ^2 for the squared symbol.`,
      answer: `${letter}^2`
    };
  },
  () => {
    const l1 = randLetter();
    let l2; do { l2 = randLetter(); } while (l2 === l1);
    const a = randInt(2, 9);
    return {
      text: `Write ${a} times ${l1} times ${l2} in algebraic notation.`,
      answer: `${a}${[l1,l2].sort().join("")}`
    };
  },
  () => {
    const letter = randLetter();
    const a = randInt(2, 9);
    const b = randInt(1, 20);
    return {
      text: `Write ${a} times ${letter} squared, added to ${b} in algebraic notation. Use ^2 for the squared symbol.`,
      answer: `${a}${letter}^2+${b}`
    };
  },
  () => {
    const letter = randLetter();
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    return {
      text: `Write ${a} times ${letter} squared, subtracted from ${b} times ${letter} in algebraic notation. Use ^2 for the squared symbol.`,
      answer: `${b}${letter}-${a}${letter}^2`
    };
  }
];

// ---- Hard Topic 3: Angle calculations — parallel lines, polygon interior angles ----
const h3_angleCalc = [
  // corresponding angles
  () => {
    const a = randInt(20, 160);
    return {
      text: `Two parallel lines are cut by a transversal. One corresponding angle is ${a} degrees. What is the other corresponding angle? _____ degrees`,
      answer: `${a}`
    };
  },
  // alternate angles
  () => {
    const a = randInt(20, 160);
    return {
      text: `Two parallel lines are cut by a transversal. One alternate angle is ${a} degrees. What is the other alternate angle? _____ degrees`,
      answer: `${a}`
    };
  },
  // co-interior angles
  () => {
    const a = randInt(20, 160);
    return {
      text: `Two parallel lines are cut by a transversal. One co-interior angle is ${a} degrees. What is the other co-interior angle? _____ degrees`,
      answer: `${180 - a}`
    };
  },
  // exterior angle of triangle = sum of other two interior
  () => {
    const a = randInt(10, 80);
    const b = randInt(10, 80);
    return {
      text: `A triangle has interior angles of ${a} and ${b} degrees. What is the exterior angle at the third vertex? _____ degrees`,
      answer: `${a + b}`
    };
  },
  // sum of interior angles of an n-sided polygon
  () => {
    const n = randInt(5, 10);
    const sum = (n - 2) * 180;
    return {
      text: `What is the sum of the interior angles of a ${n}-sided polygon? _____ degrees`,
      answer: `${sum}`
    };
  },
  // each interior angle of a regular polygon
  () => {
    const n = randChoice([5, 6, 8, 9, 10, 12]);
    const each = ((n - 2) * 180) / n;
    return {
      text: `What is each interior angle of a regular ${n}-sided polygon? _____ degrees`,
      answer: `${each}`
    };
  },
  // exterior angle of regular polygon
  () => {
    const n = randChoice([4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 36]);
    return {
      text: `What is the exterior angle of a regular ${n}-sided polygon? _____ degrees`,
      answer: `${360 / n}`
    };
  }
];

// ---- Hard Topic 4: Angle facts — polygon rules, parallel line properties ----
const h4_angleFacts = [
  () => {
    const facts = [
      ["Alternate angles are _____.", "equal"],
      ["Co-interior angles add up to _____ degrees.", "180"],
      ["Corresponding angles are _____.", "equal"],
      ["The exterior angle of a triangle equals the sum of the _____ opposite interior angles.", "two"],
      ["The sum of exterior angles of any polygon is always _____ degrees.", "360"],
      ["Each exterior angle of a regular polygon = 360 / number of _____.", "sides"]
    ];
    const f = randChoice(facts);
    return { text: `Fill in the blank: ${f[0]}`, answer: f[1] };
  },
  () => {
    const n = randInt(5, 12);
    return {
      text: `What is the formula for the sum of interior angles of a polygon with n sides? Write it using n.`,
      answer: `(n-2)x180`
    };
  }
];

// ---- Hard Topic 5: Averages — larger numbers, missing value given mean ----
const h5_averages = [
  // harder random-length average (numbers up to 100)
  () => {
    const length = randInt(3, 10);
    const type = randChoice(["mean", "median", "mode", "range"]);
    let nums, modeValue;

    if (type === "mode") {
      modeValue = randInt(1, 100);
      const others = [];
      while (others.length < length - 2) {
        const v = randInt(1, 100);
        if (v !== modeValue && !others.includes(v)) others.push(v);
      }
      nums = [modeValue, modeValue, ...others].sort(() => Math.random() - 0.5);
    } else {
      nums = Array.from({length}, () => randInt(1, 100));
    }

    if (type === "mean") {
      const sum = nums.reduce((s, n) => s + n, 0);
      const meanVal = Math.round((sum / nums.length) * 100) / 100;
      return { text: `Find the mean of ${nums.join(", ")}.`, answer: `${meanVal}` };
    }
    if (type === "median") {
      const sorted = [...nums].sort((a, b) => a - b);
      const med = sorted.length % 2 === 0
        ? midpoint(sorted[sorted.length / 2 - 1], sorted[sorted.length / 2])
        : sorted[Math.floor(sorted.length / 2)];
      return { text: `Find the median of ${nums.join(", ")}.`, answer: `${med}` };
    }
    if (type === "mode") {
      return { text: `Find the mode of ${nums.join(", ")}.`, answer: `${modeValue}` };
    }
    return { text: `Find the range of ${nums.join(", ")}.`, answer: `${Math.max(...nums) - Math.min(...nums)}` };
  },
  // find the missing value given the mean
  () => {
    const length = randInt(4, 7);
    const targetMean = randInt(10, 50);
    const targetSum = targetMean * length;
    const known = [];
    let remaining = targetSum;
    for (let i = 0; i < length - 1; i++) {
      const v = randInt(1, Math.min(remaining - (length - 1 - i), 80));
      known.push(v);
      remaining -= v;
    }
    const missing = remaining;
    if (missing < 1 || missing > 100) {
      // fallback if arithmetic goes out of range
      return { text: `Find the mean of 10, 20, 30.`, answer: `20` };
    }
    const displayed = [...known, "?"];
    return {
      text: `The mean of these ${length} numbers is ${targetMean}: ${displayed.join(", ")}. What is the missing number?`,
      answer: `${missing}`
    };
  }
];

// ---- Hard Topic 6: Charts — grouped frequency, harder pie angles ----
const h6_charts = [
  // grouped frequency table: mean from groups (kept to 3 groups so the
  // amount of arithmetic stays comparable to this topic's other templates)
  () => {
    const groups = [
      {label:"0-9", mid:4.5}, {label:"10-19", mid:14.5},
      {label:"20-29", mid:24.5}
    ];
    const freqs = groups.map(() => randInt(1, 10));
    const total = freqs.reduce((a,b)=>a+b,0);
    const weightedSum = groups.reduce((s,g,i)=>s+g.mid*freqs[i],0);
    const mean = Math.round((weightedSum/total)*100)/100;
    const tableStr = groups.map((g,i)=>`${g.label}: frequency ${freqs[i]}`).join(", ");
    return {
      text: `A grouped frequency table shows: ${tableStr}. Using midpoints, estimate the mean (to 2dp if needed).`,
      answer: `${mean}`
    };
  },
  // pie chart: find angle given percentage
  () => {
    const percent = randChoice([5,10,15,20,25,30,36,40,45,50,60,72,75,80,90]);
    const angle = Math.round(percent * 360 / 100);
    return {
      text: `A slice of a pie chart represents ${percent}% of the data. What angle does it make at the centre? _____ degrees`,
      answer: `${angle}`
    };
  },
  // pie chart: find percentage given angle
  () => {
    const angle = randChoice([18,36,45,54,60,72,90,108,120,135,144,150,180]);
    const percent = Math.round(angle * 100 / 360 * 100) / 100;
    return {
      text: `A slice of a pie chart has an angle of ${angle} degrees. What percentage does it represent?`,
      answer: `${percent}%`
    };
  },
  // dual bar chart: difference between two categories on same day
  () => {
    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
    const day = randChoice(days);
    const { theme, labels } = pickThemeCategories(2);
    const v1 = randInt(5, 30);
    const v2 = randInt(5, 30);
    return {
      text: `A dual bar chart shows two groups on ${day}: ${labels[0]}: ${v1}, ${labels[1]}: ${v2}. What is the difference between them?`,
      answer: `${Math.abs(v1 - v2)}`
    };
  }
];

// ---- Hard Topic 7: Convert — mixed numbers, percentage change ----
const h7_convert = [
  // improper fraction → mixed number
  () => {
    const den = randChoice([2,3,4,5,6,8,10]);
    const whole = randInt(1,9);
    let rem; do { rem = randInt(1, den-1); } while (gcd(rem, den) !== 1);
    const num = whole * den + rem;
    return {
      text: `Convert the improper fraction ${num}/${den} into a mixed number.`,
      answer: `${whole} ${rem}/${den}`
    };
  },
  // mixed number → improper fraction
  () => {
    const den = randChoice([2,3,4,5,6,8,10]);
    const whole = randInt(1,9);
    let rem; do { rem = randInt(1, den-1); } while (gcd(rem, den) !== 1);
    const num = whole * den + rem;
    return {
      text: `Convert the mixed number ${whole} ${rem}/${den} into an improper fraction.`,
      answer: `${num}/${den}`
    };
  },
  // percentage increase
  () => {
    const original = randChoice([20,50,100,200,400,500,1000]);
    const pct = randChoice([5,10,15,20,25,30,50,75]);
    const increase = Math.round(original * pct / 100);
    return {
      text: `Increase ${original} by ${pct}%.`,
      answer: `${original + increase}`
    };
  },
  // percentage decrease
  () => {
    const original = randChoice([20,50,100,200,400,500,1000]);
    const pct = randChoice([5,10,15,20,25,30,50,75]);
    const decrease = Math.round(original * pct / 100);
    return {
      text: `Decrease ${original} by ${pct}%.`,
      answer: `${original - decrease}`
    };
  },
  // reverse percentage: find original before increase
  () => {
    const pct = randChoice([10,20,25,50]);
    const original = randChoice([20,40,50,80,100,200]);
    const after = Math.round(original * (100 + pct) / 100);
    return {
      text: `After a ${pct}% increase, a value is ${after}. What was the original value?`,
      answer: `${original}`
    };
  },
  // reverse percentage: find original before decrease
  () => {
    const pct = randChoice([10,20,25,50]);
    const original = randChoice([20,40,50,80,100,200]);
    const after = Math.round(original * (100 - pct) / 100);
    return {
      text: `After a ${pct}% decrease, a value is ${after}. What was the original value?`,
      answer: `${original}`
    };
  }
];

// ---- Hard Topic 8: Expand & simplify — double brackets (FOIL) ----
const h8_expand = [
  // (x + a)(x + b)
  () => {
    const letter = randLetter();
    const a = randInt(1, 10);
    const b = randInt(1, 10);
    const signA = Math.random() < 0.5 ? 1 : -1;
    const signB = Math.random() < 0.5 ? 1 : -1;
    const coeff = a + b * signA * signB > 0 ? `+${a * signB + b * signA}` : `${a * signB + b * signA}`;
    // (L + sA*a)(L + sB*b) = L^2 + (sA*a + sB*b)L + sA*sB*a*b
    const linearCoeff = signA * a + signB * b;
    const constant = signA * a * signB * b;
    const linearStr = formatAddedTerm(linearCoeff, letter);
    const constStr = constant === 0 ? "" : (constant > 0 ? `+${constant}` : `${constant}`);
    const termA = signA > 0 ? `+ ${a}` : `- ${a}`;
    const termB = signB > 0 ? `+ ${b}` : `- ${b}`;
    return {
      text: `Expand and simplify (${letter} ${termA})(${letter} ${termB}). Use ^2 for squared terms.`,
      answer: `${letter}^2${linearStr}${constStr}`
    };
  },
  // (ax + b)(cx + d)
  () => {
    const letter = randLetter();
    const a = randInt(2, 5);
    const b = randInt(1, 8);
    const c = randInt(2, 5);
    const d = randInt(1, 8);
    const signB = Math.random() < 0.5 ? 1 : -1;
    const signD = Math.random() < 0.5 ? 1 : -1;
    // (aL + sB*b)(cL + sD*d) = ac*L^2 + (a*sD*d + c*sB*b)*L + sB*b*sD*d
    const quadCoeff = a * c;
    const linearCoeff = a * signD * d + c * signB * b;
    const constant = signB * b * signD * d;
    const quadStr = quadCoeff === 1 ? `${letter}^2` : `${quadCoeff}${letter}^2`;
    const linearStr = formatAddedTerm(linearCoeff, letter);
    const constStr = constant === 0 ? "" : (constant > 0 ? `+${constant}` : `${constant}`);
    const termB = signB > 0 ? `+ ${b}` : `- ${b}`;
    const termD = signD > 0 ? `+ ${d}` : `- ${d}`;
    return {
      text: `Expand and simplify (${a}${letter} ${termB})(${c}${letter} ${termD}). Use ^2 for squared terms.`,
      answer: `${quadStr}${linearStr}${constStr}`
    };
  },
  // Bridging exercise moved up from Normal: single bracket, 3 terms
  // (2 distinct letters + 1 number), outside a number or a single letter.
  () => {
    const outsideIsLetter = Math.random() < 0.5;
    const outside = outsideIsLetter
      ? { kind: "letter", value: randLetter() }
      : { kind: "number", value: randInt(2, 9) };

    const l1 = randLetter();
    let l2;
    do { l2 = randLetter(); } while (l2 === l1 || l2 === outside.value);
    const number = randInt(1, 12);
    const pool = [
      { kind: "letter", value: l1 },
      { kind: "letter", value: l2 },
      { kind: "number", value: number }
    ].sort(() => Math.random() - 0.5);
    const terms = pool.map((t, idx) => ({
      sign: idx === 0 ? 1 : (Math.random() < 0.5 ? 1 : -1),
      kind: t.kind,
      value: t.value
    }));

    const insideStr = terms
      .map((t, idx) => {
        const valStr = t.kind === "letter" ? t.value : `${t.value}`;
        if (idx === 0) return valStr;
        return (t.sign > 0 ? " + " : " - ") + valStr;
      })
      .join("");

    const outsideStr = outside.kind === "letter" ? outside.value : `${outside.value}`;

    const answer = terms
      .map((t, idx) => {
        const monomial = letterTimes(outside, { kind: t.kind, value: t.value });
        if (idx === 0) return monomial;
        return (t.sign > 0 ? "+" : "-") + monomial;
      })
      .join("");

    return {
      text: `Expand ${outsideStr}(${insideStr}). If a term is squared, write it like x^2 (using ^2 for the small "squared" 2).`,
      answer: `${answer}`
    };
  }
];

// ---- Hard Topic 9: Find X — two-step, variables on both sides ----
const h9_findX = [
  // ax + b = cx + d  =>  x = (d-b)/(a-c)
  () => {
    const letter = randChoice("abcdefghijklmnopqrstuvwyz".split(""));
    let a, c, b, d, x;
    do {
      a = randInt(2, 10);
      c = randInt(1, 9);
      x = randInt(1, 15);
      b = randInt(1, 20);
      d = a * x + b - c * x;
    } while (a === c || d < 1);
    return {
      text: `Solve for ${letter}: ${a}${letter} + ${b} = ${c}${letter} + ${d}`,
      answer: `${x}`
    };
  },
  // (ax + b) / c = d  =>  x = (cd - b) / a
  () => {
    const letter = randChoice("abcdefghijklmnopqrstuvwyz".split(""));
    const a = randInt(2, 8);
    const c = randInt(2, 8);
    const x = randInt(1, 15);
    const b = randInt(1, 20);
    const d = (a * x + b) / c;
    if (!Number.isInteger(d) || d < 1) {
      return { text: `Solve for ${letter}: 2${letter} + 4 = 14`, answer: `5` };
    }
    return {
      text: `Solve for ${letter}: (${a}${letter} + ${b}) / ${c} = ${d}`,
      answer: `${x}`
    };
  },
  // ax - b = c  (two-step)
  () => {
    const letter = randChoice("abcdefghijklmnopqrstuvwyz".split(""));
    const a = randInt(2, 12);
    const x = randInt(1, 20);
    const b = randInt(1, 30);
    const c = a * x - b;
    return {
      text: `Solve for ${letter}: ${a}${letter} - ${b} = ${c}`,
      answer: `${x}`
    };
  }
];

// ---- Hard Topic 10: Like terms — multiple different letters, longer expressions ----
const h10_likeTerms = [
  // collect terms across 4-term expression: a + b + c - d (same letter)
  () => {
    const letter = randLetter();
    const a = randInt(1,10), b = randInt(1,10), c = randInt(1,10), d = randInt(1,8);
    return {
      text: `Simplify: ${a}${letter} + ${b}${letter} + ${c}${letter} - ${d}${letter}`,
      answer: formatLeadCoeff(a+b+c-d, letter) || "0"
    };
  },
  // two different letters
  () => {
    const l1 = randLetter();
    let l2; do { l2 = randLetter(); } while (l2 === l1);
    const a = randInt(1,9), b = randInt(1,9), c = randInt(1,9), d = randInt(1,9);
    const coeffL1 = a - b;
    const coeffL2 = c + d;
    const l1Str = formatLeadCoeff(coeffL1, l1);
    const l2Str = coeffL2 === 0 ? "" : (l1Str ? `+${coeffL2}${l2}` : `${coeffL2}${l2}`);
    const ans = (l1Str + l2Str) || "0";
    return {
      text: `Simplify: ${a}${l1} - ${b}${l1} + ${c}${l2} + ${d}${l2}`,
      answer: ans
    };
  },
  // three different letters
  () => {
    const letters = [];
    while (letters.length < 3) {
      const l = randLetter();
      if (!letters.includes(l)) letters.push(l);
    }
    const coeffs = letters.map(() => randInt(1,9));
    const adds = letters.map(() => randInt(1,5));
    const result = letters.map((l,i) => `${coeffs[i]+adds[i]}${l}`).join("+");
    const expr = letters.map((l,i) => `${coeffs[i]}${l} + ${adds[i]}${l}`).join(" + ");
    return {
      text: `Simplify: ${expr}`,
      answer: result
    };
  }
];

// ---- Hard Topic 11: Multiply decimals — decimal ÷ whole, decimal × larger ----
const h11_multiplyDecimals = [
  // decimal × two-digit whole
  () => {
    const a = Math.round(randInt(1, 99)) / 10;
    const b = randInt(11, 50);
    const result = Math.round(a * b * 10000) / 10000;
    return {
      text: `What is ${a} x ${b}?`,
      answer: `${result}`
    };
  },
  // decimal ÷ whole number
  () => {
    const b = randInt(2, 10);
    const tensDigit = randInt(1, 9);
    const unitsDigit = randInt(1, 9);
    const result = (tensDigit * 10 + unitsDigit) / 100;
    const a = Math.round(result * b * 10000) / 10000;
    return {
      text: `What is ${a} / ${b}?`,
      answer: `${result}`
    };
  },
  // whole number ÷ decimal
  () => {
    const divisor = randChoice([0.1, 0.2, 0.25, 0.5]);
    const result = randInt(2, 20);
    const a = Math.round(divisor * result * 10000) / 10000;
    return {
      text: `What is ${a} / ${divisor}?`,
      answer: `${result}`
    };
  },
  // hundredths x hundredths (harder)
  () => {
    const a = (randInt(11, 99)) / 100;
    const b = (randInt(11, 99)) / 100;
    const result = Math.round(a * b * 10000) / 10000;
    return {
      text: `What is ${a} x ${b}?`,
      answer: `${result}`
    };
  }
];

// ---- Hard Topic 12: Percentage — percentage change, find percentage, find original ----
const h12_percentage = [
  // percentage change: find what % one number is of another
  () => {
    const total = randChoice([50,100,200,400,500,1000]);
    const pct = randChoice([5,10,15,20,25,30,40,50,60,75,80]);
    const part = Math.round(total * pct / 100);
    return {
      text: `What percentage is ${part} of ${total}?`,
      answer: `${pct}%`
    };
  },
  // find the percentage increase between two values
  () => {
    const original = randChoice([50,100,200,400,500]);
    const pct = randChoice([10,20,25,50]);
    const newVal = original + Math.round(original * pct / 100);
    return {
      text: `A value increased from ${original} to ${newVal}. What is the percentage increase?`,
      answer: `${pct}%`
    };
  },
  // find the percentage decrease between two values
  () => {
    const original = randChoice([50,100,200,400,500]);
    const pct = randChoice([10,20,25,50]);
    const newVal = original - Math.round(original * pct / 100);
    return {
      text: `A value decreased from ${original} to ${newVal}. What is the percentage decrease?`,
      answer: `${pct}%`
    };
  }
];

// ---- Hard Topic 14: Powers & roots — cube roots, negative/fractional indices ----
const h14_powersRoots = [
  // cube root
  () => {
    const base = randInt(2, 10);
    return {
      text: `What is the cube root of ${base ** 3}?`,
      answer: `${base}`
    };
  },
  // negative index: a^-n = 1/a^n
  () => {
    const base = randChoice([2, 3, 4, 5, 10]);
    const exp = randChoice([1, 2, 3]);
    const ans = `1/${base ** exp}`;
    return {
      text: `What is ${base}^-${exp}? Write as a fraction.`,
      answer: ans
    };
  },
  // fractional index: a^(1/2) = sqrt, a^(1/3) = cube root
  () => {
    const useSquare = Math.random() < 0.5;
    if (useSquare) {
      const base = randInt(2, 15);
      return {
        text: `What is ${base * base}^(1/2)?`,
        answer: `${base}`
      };
    }
    const base = randInt(2, 8);
    return {
      text: `What is ${base ** 3}^(1/3)?`,
      answer: `${base}`
    };
  },
  // higher powers — kept in the same rough magnitude (up to ~1000) as the
  // cube-root/negative-index siblings above, instead of spiking to 46656
  () => {
    const base = randInt(2, 5);
    const exp = randInt(3, 4);
    return {
      text: `What is ${base} to the power of ${exp}?`,
      answer: `${base ** exp}`
    };
  }
];

// ---- Hard Topic 15: Primes/Factors — prime factorisation, harder HCF/LCM ----
const h15_primesFactors = [
  // prime factorisation using index notation — capped so n stays comparable
  // to this topic's HCF/LCM siblings (roughly a few hundred, not thousands)
  () => {
    const primes = [2, 3, 5, 7];
    let base, exp, other, n;
    do {
      base = randChoice(primes);
      exp = randInt(2, 3);
      other = randChoice(primes.filter(p => p !== base));
      n = (base ** exp) * other;
    } while (n > 400);
    const factorStr = base === other ? `${base}^${exp+1}` : `${base}^${exp} x ${other}`;
    return {
      text: `Write ${n} as a product of its prime factors using index notation.`,
      answer: factorStr
    };
  },
  // find HCF from larger numbers using prime factorisation
  () => {
    const sharedPrime = randChoice([2, 3, 5, 7]);
    const extra1 = randChoice([2, 3, 5, 7].filter(p => p !== sharedPrime));
    const extra2 = randChoice([2, 3, 5, 7].filter(p => p !== sharedPrime));
    const a = sharedPrime * extra1 * randInt(1, 3);
    const b = sharedPrime * extra2 * randInt(1, 3);
    return {
      text: `What is the HCF of ${a} and ${b}?`,
      answer: `${gcd(a, b)}`
    };
  },
  // LCM from harder numbers
  () => {
    const pool = [6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25, 30];
    const a = randChoice(pool);
    const b = randChoice(pool);
    return {
      text: `What is the LCM of ${a} and ${b}?`,
      answer: `${(a * b) / gcd(a, b)}`
    };
  }
];

// ---- Hard Topic 16: Ratio — three-part ratios ----
const h16_ratio = [
  () => {
    const subType = randChoice(["share3","simplify3","total3","missing3","difference3"]);
    const theme = randChoice(RATIO_THEMES);
    const names = [theme.a, theme.b, randChoice(["Carl","Diana","Eve","Frank"])];

    const a = randInt(1,6), b = randInt(1,6), c = randInt(1,6);
    const scale = randInt(2,8);
    const vals = [a*scale, b*scale, c*scale];
    const total = vals.reduce((s,v)=>s+v,0);

    if (subType === "share3") {
      const idx = randInt(0,2);
      return {
        text: `${names[0]}, ${names[1]} and ${names[2]} share ${total} ${theme.unit} in the ratio ${a}:${b}:${c}. How many does ${names[idx]} get?`,
        answer: `${vals[idx]}`
      };
    }
    if (subType === "simplify3") {
      const g2 = randInt(2,6);
      return {
        text: `Simplify the ratio ${a*g2}:${b*g2}:${c*g2}.`,
        answer: `${a}:${b}:${c}`
      };
    }
    if (subType === "total3") {
      return {
        text: `${names[0]}, ${names[1]} and ${names[2]} share ${theme.unit} in the ratio ${a}:${b}:${c}. ${names[0]} gets ${vals[0]}, ${names[1]} gets ${vals[1]} and ${names[2]} gets ${vals[2]}. What is the total?`,
        answer: `${total}`
      };
    }
    if (subType === "missing3") {
      const hideIdx = randInt(0,2);
      const knownStr = names.map((n,i)=>i===hideIdx?null:`${n} gets ${vals[i]}`).filter(Boolean).join(", ");
      return {
        text: `${names.join(", ")} share ${theme.unit} in ratio ${a}:${b}:${c}. Total is ${total}. ${knownStr}. How many does ${names[hideIdx]} get?`,
        answer: `${vals[hideIdx]}`
      };
    }
    // difference3: between biggest and smallest
    const maxV = Math.max(...vals), minV = Math.min(...vals);
    return {
      text: `${names[0]}, ${names[1]} and ${names[2]} share ${total} ${theme.unit} in ratio ${a}:${b}:${c}. What is the difference between the largest and smallest share?`,
      answer: `${maxV - minV}`
    };
  }
];

// ---- Hard Topic 17: Recurring — mixed recurring, harder conversions ----
const h17_recurring = [
  // mixed recurring: 0.1333... = 2/15  (non-recurring part + recurring part)
  () => {
    // 0.a(b) = (ab - a) / 90  where a is non-recurring digit, b is recurring digit
    const a = randInt(1, 8);
    const b = randInt(1, 9);
    const num = (a * 10 + b) - a; // = 9a + b
    const den = 90;
    const [sn, sd] = simplifyFraction(num, den);
    return {
      text: `Convert the mixed recurring decimal 0.${a}${b}${b}${b}... (where ${b} repeats) into a fraction in its simplest form.`,
      answer: `${sn}/${sd}`
    };
  },
  // harder: given a fraction convert to recurring notation
  () => {
    const validFracs = [{n:1,d:3},{n:2,d:3},{n:1,d:6},{n:5,d:6},{n:1,d:7},{n:1,d:9},{n:2,d:9},{n:4,d:9}];
    const {n, d} = randChoice(validFracs);
    // compute recurring decimal by long division (up to 6 digits)
    let digits = "", remainder = n;
    for (let i = 0; i < 6; i++) {
      remainder *= 10;
      digits += Math.floor(remainder / d);
      remainder = remainder % d;
      if (remainder === 0) break;
    }
    return {
      text: `Write ${n}/${d} as a recurring decimal. Use the format 0.ddd...`,
      answer: `0.${digits}...`
    };
  }
];

// ---- Hard Topic 18: Simplifying — improper fractions, subtract/multiply/divide ----
const h18_simplifying = [
  // subtract fractions (different denominators)
  () => {
    const denA = randChoice([3,4,5,6,8,10,12]);
    const mult = randChoice([2,3,4]);
    const denB = denA * mult;
    const numA = randInt(1, denA-1);
    const numB = randInt(1, denB-1);
    const resNum = numA * mult - numB;
    const resDen = denB;
    if (resNum <= 0) return { text:`Simplify 4/6.`, answer:`2/3` };
    const [sn, sd] = simplifyFraction(resNum, resDen);
    return {
      text: `Calculate ${numA}/${denA} - ${numB}/${denB}. Simplify your answer if possible.`,
      answer: `${sn}/${sd}`
    };
  },
  // multiply two fractions
  () => {
    const {num:n1, den:d1} = randSimplifiedFraction();
    const {num:n2, den:d2} = randSimplifiedFraction();
    const [sn, sd] = simplifyFraction(n1*n2, d1*d2);
    return {
      text: `Calculate ${n1}/${d1} x ${n2}/${d2}. Simplify your answer if possible.`,
      answer: `${sn}/${sd}`
    };
  },
  // divide two fractions
  () => {
    const {num:n1, den:d1} = randSimplifiedFraction();
    const {num:n2, den:d2} = randSimplifiedFraction();
    const [sn, sd] = simplifyFraction(n1*d2, d1*n2);
    return {
      text: `Calculate ${n1}/${d1} / ${n2}/${d2}. Simplify your answer if possible.`,
      answer: `${sn}/${sd}`
    };
  },
];

// ---- Hard Topic 19: X-axis/Y-axis — distance (Pythagoras), gradient, line equation ----
const h19_axes = [
  // distance between any two points (Pythagoras)
  () => {
    // pick points that give a clean hypotenuse
    const pythagoreanTriples = [[3,4,5],[5,12,13],[6,8,10],[8,15,17],[9,12,15]];
    const [dx, dy, dist] = randChoice(pythagoreanTriples);
    const signX = randChoice([-1,1]), signY = randChoice([-1,1]);
    const x1 = randInt(-5,5), y1 = randInt(-5,5);
    const x2 = x1 + dx * signX, y2 = y1 + dy * signY;
    return {
      text: `What is the distance between the points (${x1}, ${y1}) and (${x2}, ${y2})?`,
      answer: `${dist}`
    };
  },
  // gradient between two points
  () => {
    const x1 = randInt(-5,4), y1 = randInt(-5,5);
    const run = randInt(1,6);
    const rise = randInt(-6,6);
    const x2 = x1 + run, y2 = y1 + rise;
    const [sn, sd] = simplifyFraction(rise, run);
    const gradStr = sd === 1 ? `${sn}` : `${sn}/${sd}`;
    return {
      text: `What is the gradient of the line passing through (${x1}, ${y1}) and (${x2}, ${y2})?`,
      answer: gradStr
    };
  },
  // equation of a line: y = mx + c, given m and one point
  () => {
    const m = randChoice([-3,-2,-1,1,2,3]);
    const x1 = randInt(-5,5), y1 = randInt(-5,5);
    const c = y1 - m * x1;
    const mStr = m === 1 ? "" : m === -1 ? "-" : `${m}`;
    const cStr = c === 0 ? "" : c > 0 ? `+${c}` : `${c}`;
    return {
      text: `A line has gradient ${m} and passes through (${x1}, ${y1}). What is its equation in the form y = mx + c?`,
      answer: `y=${mStr}x${cStr}`
    };
  },
  // midpoint of two coordinates (harder: larger range)
  () => {
    const x1 = randInt(-20,20), y1 = randInt(-20,20);
    const x2 = randInt(-20,20), y2 = randInt(-20,20);
    return {
      text: `What is the midpoint of (${x1}, ${y1}) and (${x2}, ${y2})?`,
      answer: `(${midpoint(x1,x2)}, ${midpoint(y1,y2)})`
    };
  }
];

// ---- assemble Hard ----
questions.hard = [
  h1_primary,
  h2_algNotation,
  h3_angleCalc,
  h4_angleFacts,
  h5_averages,
  h6_charts,
  h7_convert,
  h8_expand,
  h9_findX,
  h10_likeTerms,
  h11_multiplyDecimals,
  h12_percentage,
  h14_powersRoots,
  h15_primesFactors,
  h16_ratio,
  h17_recurring,
  h18_simplifying,
  h19_axes
];


// ============================================================
// MASTER — 12 hardest Green topics (harder than Hard) +
//          7 easiest Yellow topics (hard questions)
// ============================================================

// ---- Master Green 1: Angle calculations ----
const m_angleCalc = [
  // angles in parallel lines with algebra
  () => {
    const x = randInt(5, 25);
    const a = randInt(2, 6);
    const b = randInt(1, 30);
    const angle = a * x + b;
    const coAngle = 180 - angle;
    const coA = randInt(1, 4);
    const coB = coAngle - coA * x;
    if (coB < 1) return { text: `Two parallel lines are cut by a transversal. Co-interior angles are 3x+10 and 2x+20. Find x.`, answer: `30` };
    return {
      text: `Two parallel lines are cut by a transversal. Co-interior angles are (${a}x+${b}) and (${coA}x+${coB}) degrees. Find x.`,
      answer: `${x}`
    };
  },
  // polygon: find number of sides from interior angle sum
  () => {
    const n = randInt(5, 12);
    const sum = (n - 2) * 180;
    return {
      text: `The sum of interior angles of a polygon is ${sum} degrees. How many sides does it have?`,
      answer: `${n}`
    };
  },
  // polygon: find number of sides from exterior angle
  () => {
    const n = randChoice([4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 36]);
    const ext = 360 / n;
    return {
      text: `The exterior angle of a regular polygon is ${ext} degrees. How many sides does it have?`,
      answer: `${n}`
    };
  },
  // angles in a triangle with algebra
  () => {
    const x = randInt(10, 40);
    const a = randInt(2, 5);
    const b = randInt(1, 30);
    const c = randInt(1, 30);
    const third = 180 - (a * x + b) - c;
    if (third < 1) return { text: `A triangle has angles x+20, 2x+10 and 3x+30 degrees. Find x.`, answer: `20` };
    return {
      text: `A triangle has angles (${a}x+${b}), ${c} and ${third} degrees. Find x.`,
      answer: `${x}`
    };
  },
];

// ---- Master Green 2: Averages ----
const m_averages = [
  // estimated mean from grouped frequency (wider groups)
  () => {
    const groups = [
      {label:"1-10",mid:5.5},{label:"11-20",mid:15.5},
      {label:"21-30",mid:25.5},{label:"31-40",mid:35.5},{label:"41-50",mid:45.5}
    ];
    const freqs = groups.map(() => randInt(2, 12));
    const total = freqs.reduce((a,b)=>a+b,0);
    const ws = groups.reduce((s,g,i)=>s+g.mid*freqs[i],0);
    const mean = Math.round(ws / total * 100) / 100;
    const tableStr = groups.map((g,i)=>`${g.label}: f=${freqs[i]}`).join(", ");
    return {
      text: `Grouped frequency table: ${tableStr}. Estimate the mean using midpoints (to 2dp if needed).`,
      answer: `${mean}`
    };
  },
  // find missing value given mean — multiple unknowns constrained
  () => {
    const length = randInt(5, 8);
    const targetMean = randInt(20, 60);
    const targetSum = targetMean * length;
    const known = [];
    let remaining = targetSum;
    for (let i = 0; i < length - 1; i++) {
      const cap = Math.min(remaining - (length - 1 - i), 99);
      if (cap < 1) { known.push(1); remaining -= 1; continue; }
      const v = randInt(1, cap);
      known.push(v);
      remaining -= v;
    }
    const missing = remaining;
    if (missing < 1 || missing > 120) return { text:`Find the mean of 10, 20, 30, 40, 50.`, answer:`30` };
    return {
      text: `The mean of ${length} numbers is ${targetMean}. The known values are: ${known.join(", ")}. Find the missing value.`,
      answer: `${missing}`
    };
  },
  // interquartile range
  () => {
    const nums = Array.from({length: randInt(8, 12)}, () => randInt(1, 50)).sort((a,b)=>a-b);
    const q1idx = Math.floor(nums.length / 4);
    const q3idx = Math.floor(nums.length * 3 / 4);
    const iqr = nums[q3idx] - nums[q1idx];
    return {
      text: `Find the interquartile range (IQR) of: ${nums.join(", ")}.`,
      answer: `${iqr}`
    };
  }
];

// ---- Master Green 3: Convert ----
const m_convert = [
  // recurring decimal to fraction (complex two-digit)
  () => {
    let num; do { num = randInt(12, 97); } while (gcd(num, 99) === num);
    const [sn, sd] = simplifyFraction(num, 99);
    const str = String(num).padStart(2,"0");
    return {
      text: `Convert the recurring decimal 0.${str}${str}... to a fraction in its simplest form.`,
      answer: `${sn}/${sd}`
    };
  },
  // complex percentage change: chain two changes
  () => {
    const pct1 = randChoice([10, 20, 25, 50]);
    const pct2 = randChoice([10, 20, 25, 50]);
    const original = randChoice([100, 200, 400, 1000]);
    const after1 = original * (100 + pct1) / 100;
    const after2 = Math.round(after1 * (100 - pct2) / 100);
    return {
      text: `A value of ${original} is increased by ${pct1}%, then decreased by ${pct2}%. What is the final value?`,
      answer: `${after2}`
    };
  },
  // compound interest
  () => {
    const principal = randChoice([100, 200, 500, 1000]);
    const rate = randChoice([5, 10, 20, 25]);
    const years = randInt(2, 3);
    let amount = principal;
    for (let i = 0; i < years; i++) amount = Math.round(amount * (1 + rate/100) * 100) / 100;
    return {
      text: `£${principal} is invested at ${rate}% compound interest per year for ${years} years. What is the total amount?`,
      answer: `£${amount}`
    };
  },
  // standard form: write in standard form
  () => {
    const coeff = randInt(1, 9) + randChoice([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
    const exp = randChoice([-3, -2, -1, 2, 3, 4, 5]);
    const value = Math.round(coeff * (10 ** exp) * 10000) / 10000;
    return {
      text: `Write ${coeff} x 10^${exp} as an ordinary number.`,
      answer: `${value}`
    };
  },
  // standard form: convert to standard form
  () => {
    const exp = randChoice([2, 3, 4, 5]);
    const coeff = (randInt(1, 9) * 10 + randInt(0, 9)) / 10;
    const value = Math.round(coeff * (10 ** exp));
    return {
      text: `Write ${value} in standard form (A x 10^n).`,
      answer: `${coeff} x 10^${exp}`
    };
  }
];

// ---- Master Green 4: Expand & simplify ----
const m_expand = [
  // difference of two squares: (a+b)(a-b) = a²-b²
  () => {
    const letter = randLetter();
    const n = randInt(2, 12);
    return {
      text: `Expand and simplify (${letter}+${n})(${letter}-${n}). Use ^2 for squared terms.`,
      answer: `${letter}^2-${n*n}`
    };
  },
  // perfect square: (a+b)² = a²+2ab+b²
  () => {
    const letter = randLetter();
    const n = randInt(2, 10);
    const sign = randChoice(["+", "-"]);
    const linear = sign === "+" ? 2*n : -2*n;
    const constant = n*n;
    const linearStr = linear > 0 ? `+${linear}${letter}` : `${linear}${letter}`;
    return {
      text: `Expand and simplify (${letter}${sign}${n})^2. Use ^2 for squared terms.`,
      answer: `${letter}^2${linearStr}+${constant}`
    };
  },
  // triple brackets: (x+a)(x+b)(x+c) — kept small since this is already a
  // step up (cubic) from the quadratic siblings above in this same topic
  () => {
    const letter = randLetter();
    const a = randInt(1, 3);
    const b = randInt(1, 3);
    const c = randInt(1, 3);
    // first expand (letter+a)(letter+b) then multiply by (letter+c)
    const ab_linear = a + b;
    const ab_const = a * b;
    // (L²+ab_linear·L+ab_const)(L+c)
    const cubicCoeff = 1;
    const quadCoeff = ab_linear + c;
    const linearCoeff = ab_const + ab_linear * c;
    const constant = ab_const * c;
    const quadStr = quadCoeff === 0 ? "" : `+${quadCoeff}${letter}^2`;
    const linearStr = linearCoeff === 0 ? "" : `+${linearCoeff}${letter}`;
    const constStr = constant === 0 ? "" : `+${constant}`;
    return {
      text: `Expand and simplify (${letter}+${a})(${letter}+${b})(${letter}+${c}). Use ^2 and ^3 for powers.`,
      answer: `${letter}^3${quadStr}${linearStr}${constStr}`
    };
  }
];

// ---- Master Green 5: Find X ----
const m_findX = [
  // simultaneous equations (elimination)
  () => {
    const x = randInt(1, 8);
    const y = randInt(1, 8);
    const a1 = randInt(1, 5), b1 = randInt(1, 5);
    const a2 = randInt(1, 5), b2 = randInt(1, 5);
    const c1 = a1*x + b1*y;
    const c2 = a2*x + b2*y;
    if (a1*b2 === a2*b1) return { text:`Solve: 2x+y=7 and x+y=4. Find x.`, answer:`3` };
    return {
      text: `Solve the simultaneous equations: ${a1}x+${b1}y=${c1} and ${a2}x+${b2}y=${c2}. Find x.`,
      answer: `${x}`
    };
  },
  // simultaneous — find y
  () => {
    const x = randInt(1, 8);
    const y = randInt(1, 8);
    const a1 = randInt(1, 5), b1 = randInt(1, 5);
    const a2 = randInt(1, 5), b2 = randInt(1, 5);
    const c1 = a1*x + b1*y;
    const c2 = a2*x + b2*y;
    if (a1*b2 === a2*b1) return { text:`Solve: 2x+y=7 and x+y=4. Find y.`, answer:`1` };
    return {
      text: `Solve the simultaneous equations: ${a1}x+${b1}y=${c1} and ${a2}x+${b2}y=${c2}. Find y.`,
      answer: `${y}`
    };
  },
  // quadratic: simple factorised form (x+a)(x+b)=0
  () => {
    const r1 = randInt(-8, 8);
    const r2 = randInt(-8, 8);
    const b = -(r1 + r2);
    const c = r1 * r2;
    const bStr = b === 0 ? "" : (b > 0 ? `+${b}x` : `${b}x`);
    const cStr = c === 0 ? "" : (c > 0 ? `+${c}` : `${c}`);
    const roots = [...new Set([r1, r2])].sort((a,b)=>a-b);
    return {
      text: `Solve x^2${bStr}${cStr}=0. Give both solutions separated by a comma.`,
      answer: roots.join(", ")
    };
  }
];

// ---- Master Green 6: Like terms ----
const m_likeTerms = [
  // mixed: linear and squared terms, multiple letters
  () => {
    const l = randLetter();
    const a = randInt(2, 8), b = randInt(2, 6), c = randInt(1, 5), d = randInt(1, b - 1);
    const linCoeff = b - d;
    const linStr = formatAddedTerm(linCoeff, l);
    return {
      text: `Simplify: ${a}${l}^2 + ${b}${l} + ${c}${l}^2 - ${d}${l}. Use ^2 for squared terms.`,
      answer: `${a+c}${l}^2${linStr}`
    };
  },
  // expand then simplify: a(bx+c) + d(ex+f)
  () => {
    const l = randLetter();
    const a=randInt(2,6), b=randInt(2,8), c=randInt(1,10);
    const d=randInt(2,6), e=randInt(2,8), f=randInt(1,10);
    const linCoeff = a*b + d*e;
    const constTerm = a*c + d*f;
    return {
      text: `Expand and simplify: ${a}(${b}${l}+${c}) + ${d}(${e}${l}+${f})`,
      answer: `${linCoeff}${l}+${constTerm}`
    };
  },
  // expand then simplify with subtraction between brackets
  () => {
    const l = randLetter();
    const a=randInt(2,6), b=randInt(2,8), c=randInt(1,10);
    const d=randInt(2,6), e=randInt(2,8), f=randInt(1,10);
    const linCoeff = a*b - d*e;
    const constTerm = a*c - d*f;
    const linStr = linCoeff === 0 ? "0" : formatLeadCoeff(linCoeff, l);
    const constStr = constTerm === 0 ? "" : (constTerm > 0 ? `+${constTerm}` : `${constTerm}`);
    return {
      text: `Expand and simplify: ${a}(${b}${l}+${c}) - ${d}(${e}${l}+${f})`,
      answer: linCoeff === 0 ? `${constTerm}` : `${linStr}${constStr}`
    };
  }
];

// ---- Master Green 7: Powers & roots ----
const m_powersRoots = [
  // laws of indices: multiply same base
  () => {
    const base = randChoice([2,3,5,10]);
    const p = randInt(2,5), q = randInt(2,5);
    return {
      text: `Simplify ${base}^${p} x ${base}^${q}. Write as ${base}^n.`,
      answer: `${base}^${p+q}`
    };
  },
  // laws of indices: divide same base
  () => {
    const base = randChoice([2,3,5,10]);
    const p = randInt(4,8), q = randInt(1,3);
    return {
      text: `Simplify ${base}^${p} / ${base}^${q}. Write as ${base}^n.`,
      answer: `${base}^${p-q}`
    };
  },
  // laws of indices: power of a power
  () => {
    const base = randChoice([2,3,5]);
    const p = randInt(2,4), q = randInt(2,4);
    return {
      text: `Simplify (${base}^${p})^${q}. Write as ${base}^n.`,
      answer: `${base}^${p*q}`
    };
  },
  // surds: simplify √n
  () => {
    const outer = randInt(2,6);
    const inner = randChoice([2,3,5,6,7]);
    const n = outer * outer * inner;
    return {
      text: `Simplify √${n}. Write in the form a√b.`,
      answer: `${outer}√${inner}`
    };
  },
  // surds: multiply √a x √b
  () => {
    const a = randChoice([2,3,5,6,7,10]);
    const b = randChoice([2,3,5,6,7,10]);
    const product = a * b;
    const outerSq = Math.floor(Math.sqrt(product));
    const inner = product / (outerSq * outerSq);
    const outer = outerSq;
    const answer = outer === 1 ? `√${product}` : (inner === 1 ? `${outer}` : `${outer}√${inner}`);
    return {
      text: `Simplify √${a} x √${b}. Write in simplest form.`,
      answer: answer
    };
  }
];

// ---- Master Green 8: Primes & Factors ----
const m_primesFactors = [
  // prime factorisation of larger numbers — capped so n stays comparable
  // to this topic's HCF/LCM siblings instead of spiking into the thousands
  () => {
    const primes = [2,3,5,7];
    let p1, p2, e1, e2, n;
    do {
      p1 = randChoice(primes);
      p2 = randChoice(primes.filter(p=>p!==p1));
      e1 = randInt(2,3); e2 = randInt(1,2);
      n = (p1**e1) * (p2**e2);
    } while (n > 300);
    const factors = [{p:p1,e:e1},{p:p2,e:e2}].sort((a,b)=>a.p-b.p);
    const factorStr = factors.map(f=>f.e===1?`${f.p}`:`${f.p}^${f.e}`).join(" x ");
    return {
      text: `Write ${n} as a product of its prime factors in index notation.`,
      answer: factorStr
    };
  },
  // HCF of three numbers
  () => {
    const g = randChoice([2,3,4,5,6]);
    const a = g * randInt(2,8);
    const b = g * randInt(2,8);
    const c = g * randInt(2,8);
    return {
      text: `Find the HCF of ${a}, ${b} and ${c}.`,
      answer: `${gcd(gcd(a,b),c)}`
    };
  },
  // LCM of three numbers
  () => {
    const pool = [2,3,4,5,6,8,10,12];
    const a = randChoice(pool), b = randChoice(pool), c = randChoice(pool);
    const lcm2 = (a*b) / gcd(a,b);
    const lcm3 = (lcm2*c) / gcd(lcm2,c);
    return {
      text: `Find the LCM of ${a}, ${b} and ${c}.`,
      answer: `${lcm3}`
    };
  }
];

// ---- Master Green 9: Ratio ----
const m_ratio = [
  // ratio with algebra: a:b = c:d, find missing
  () => {
    const a = randInt(2, 10), b = randInt(2, 10);
    const scale = randInt(2, 8);
    const c = a * scale;
    const d = b * scale;
    const hideD = Math.random() < 0.5;
    if (hideD) {
      return {
        text: `The ratio ${a}:${b} is equivalent to ${c}:n. Find n.`,
        answer: `${d}`
      };
    }
    return {
      text: `The ratio ${a}:${b} is equivalent to n:${d}. Find n.`,
      answer: `${c}`
    };
  },
  // combining two ratios: a:b and b:c → a:b:c
  () => {
    const a = randInt(1,6), b = randInt(1,6), c = randInt(1,6);
    const scale = randInt(2,5);
    const bScaled = b * scale;
    // present as a:b1 and b2:c where b1 and b2 are different multiples of b
    return {
      text: `The ratio of A:B is ${a}:${b} and the ratio of B:C is ${b*scale}:${c*scale}. Express A:B:C as a single ratio in its simplest form.`,
      answer: `${a}:${b}:${c}`
    };
  },
  // dividing in ratio and finding total from one part
  () => {
    const a = randInt(1,8), b = randInt(1,8);
    const scale = randInt(3,12);
    const aPart = a * scale, bPart = b * scale;
    const total = aPart + bPart;
    const showA = Math.random() < 0.5;
    const theme = randChoice(RATIO_THEMES);
    return {
      text: `${theme.a} and ${theme.b} share ${theme.unit} in the ratio ${a}:${b}. ${showA ? theme.a : theme.b} receives ${showA ? aPart : bPart} ${theme.unit}. What is the total?`,
      answer: `${total}`
    };
  }
];

// ---- Master Green 10: Recurring decimals ----
const m_recurring = [
  // prove algebraically: 0.abab... = ab/99 using x = 0.abab...
  () => {
    let num; do { num = randInt(12,97); } while (gcd(num,99) === num);
    const [sn,sd] = simplifyFraction(num,99);
    const str = String(num).padStart(2,"0");
    return {
      text: `Use algebra to convert the recurring decimal 0.${str}${str}... to a fraction. Show the fraction in its simplest form.`,
      answer: `${sn}/${sd}`
    };
  },
  // complex mixed recurring: 0.ab̄ (first digit non-recurring, second recurring)
  () => {
    const a = randInt(1,9), b = randInt(1,9);
    // 0.ab̄... = (10a+b - a) / 90 = (9a+b) / 90
    const num = 9*a + b;
    const [sn,sd] = simplifyFraction(num, 90);
    return {
      text: `Convert 0.${a}${b}${b}${b}... (where ${b} repeats) to a fraction in its simplest form.`,
      answer: `${sn}/${sd}`
    };
  },
  // three-digit recurring to fraction
  () => {
    let num; do { num = randInt(101,998); } while (gcd(num,999) === num);
    const [sn,sd] = simplifyFraction(num,999);
    const str = String(num).padStart(3,"0");
    return {
      text: `Convert 0.${str}${str}... to a fraction in its simplest form.`,
      answer: `${sn}/${sd}`
    };
  }
];

// ---- Master Green 11: Simplifying ----
const m_simplifying = [
  // add mixed numbers
  () => {
    const den = randChoice([3,4,5,6,8]);
    const w1 = randInt(1,5), n1 = randInt(1,den-1);
    const w2 = randInt(1,5), n2 = randInt(1,den-1);
    const totalNum = n1 + n2;
    const extraWhole = Math.floor(totalNum / den);
    const remNum = totalNum % den;
    const totalWhole = w1 + w2 + extraWhole;
    const [sn,sd] = remNum === 0 ? [0,1] : simplifyFraction(remNum, den);
    const answer = sn === 0 ? `${totalWhole}` : `${totalWhole} ${sn}/${sd}`;
    return {
      text: `Calculate ${w1} ${n1}/${den} + ${w2} ${n2}/${den}. Simplify your answer.`,
      answer: answer
    };
  },
  // subtract mixed numbers
  () => {
    const den = randChoice([3,4,5,6,8]);
    const w1 = randInt(3,8), n1 = randInt(1,den-1);
    const w2 = randInt(1,w1-1), n2 = randInt(1,den-1);
    let wholeAns, numAns;
    if (n1 >= n2) {
      wholeAns = w1 - w2;
      numAns = n1 - n2;
    } else {
      wholeAns = w1 - w2 - 1;
      numAns = n1 + den - n2;
    }
    const [sn,sd] = numAns === 0 ? [0,1] : simplifyFraction(numAns, den);
    const answer = sn === 0 ? `${wholeAns}` : `${wholeAns} ${sn}/${sd}`;
    return {
      text: `Calculate ${w1} ${n1}/${den} - ${w2} ${n2}/${den}. Simplify your answer.`,
      answer: answer
    };
  },
  // multiply mixed numbers
  () => {
    const den1 = randChoice([2,3,4,5]);
    const den2 = randChoice([2,3,4,5]);
    const w1 = randInt(1,4), n1 = randInt(1,den1-1);
    const w2 = randInt(1,4), n2 = randInt(1,den2-1);
    const imp1num = w1*den1 + n1;
    const imp2num = w2*den2 + n2;
    const [sn,sd] = simplifyFraction(imp1num*imp2num, den1*den2);
    const whole = Math.floor(sn/sd);
    const remNum = sn % sd;
    const answer = remNum === 0 ? `${whole}` : `${whole} ${remNum}/${sd}`;
    return {
      text: `Calculate ${w1} ${n1}/${den1} x ${w2} ${n2}/${den2}. Simplify your answer.`,
      answer: answer
    };
  }
];

// ---- Master Green 12: X/Y-axis ----
const m_axes = [
  // equation of a line from two points
  () => {
    const m = randChoice([-3,-2,-1,1,2,3]);
    const x1 = randInt(-5,5), y1 = randInt(-5,5);
    const x2 = x1 + randChoice([-3,-2,-1,1,2,3]);
    const y2 = y1 + m*(x2-x1);
    const c = y1 - m*x1;
    const mStr = m===1?"":m===-1?"-":`${m}`;
    const cStr = c===0?"":c>0?`+${c}`:`${c}`;
    return {
      text: `Find the equation of the line through (${x1},${y1}) and (${x2},${y2}).`,
      answer: `y=${mStr}x${cStr}`
    };
  },
  // are two lines parallel (same gradient)?
  () => {
    const m = randInt(-4,4);
    const c1 = randInt(-5,5), c2 = randInt(-5,5);
    const parallel = Math.random() < 0.5;
    const m2 = parallel ? m : m + randChoice([-2,-1,1,2]);
    const mStr  = m===1?"":m===-1?"-":`${m}`;
    const m2Str = m2===1?"":m2===-1?"-":`${m2}`;
    const c1Str = c1===0?"":c1>0?`+${c1}`:`${c1}`;
    const c2Str = c2===0?"":c2>0?`+${c2}`:`${c2}`;
    return {
      text: `Are the lines y=${mStr}x${c1Str} and y=${m2Str}x${c2Str} parallel? Answer yes or no.`,
      answer: parallel ? "yes" : "no"
    };
  },
  // distance between two arbitrary points (Pythagoras — clean triples)
  () => {
    const triples = [[3,4,5],[5,12,13],[6,8,10],[8,15,17],[9,12,15],[7,24,25]];
    const [dx,dy,dist] = randChoice(triples);
    const sx = randChoice([-1,1]), sy = randChoice([-1,1]);
    const x1 = randInt(-8,8), y1 = randInt(-8,8);
    return {
      text: `What is the distance between (${x1},${y1}) and (${x1+dx*sx},${y1+dy*sy})?`,
      answer: `${dist}`
    };
  },
];

// ============================================================
// MASTER YELLOW — 7 easiest Yellow topics
// ============================================================

// ---- Yellow 1: Fibonacci Sequence ----
const y_fibonacci = [
  () => {
    // give first two terms, ask for nth
    const a = randInt(1,5), b = randInt(1,5);
    const depth = randInt(4,8);
    const seq = [a, b];
    while (seq.length < depth) seq.push(seq[seq.length-1] + seq[seq.length-2]);
    return {
      text: `A Fibonacci-style sequence starts ${a}, ${b}, ... Find the ${depth}th term.`,
      answer: `${seq[depth-1]}`
    };
  },
  () => {
    // standard Fibonacci — which term is this?
    const fib = [1,1,2,3,5,8,13,21,34,55,89,144];
    const idx = randInt(4, 11);
    return {
      text: `In the standard Fibonacci sequence (1, 1, 2, 3, 5, ...), what is the ${idx}th term?`,
      answer: `${fib[idx-1]}`
    };
  },
  () => {
    // consecutive Fibonacci terms given, find missing
    const fib = [1,1,2,3,5,8,13,21,34,55,89,144];
    const idx = randInt(2,10);
    const prev = fib[idx-1], next = fib[idx+1];
    return {
      text: `In the Fibonacci sequence, the terms on either side of a missing term are ${prev} and ${next}. What is the missing term?`,
      answer: `${fib[idx]}`
    };
  },
];

// ---- Yellow 2: nth term ----
const y_nthTerm = [
  // find nth term formula from a sequence
  () => {
    const a = randInt(1,10), d = randInt(1,10);
    const terms = [1,2,3,4,5].map(n => a + d*(n-1));
    return {
      text: `Find the nth term of the sequence: ${terms.join(", ")}, ...`,
      answer: formatLinearTerm(d, "n", a-d)
    };
  },
  // find a specific term given formula
  () => {
    const a = randInt(1,10), d = randInt(1,10);
    const n = randInt(5,20);
    const val = a + d*(n-1);
    return {
      text: `The nth term of a sequence is ${d}n+${a-d}. What is the ${n}th term?`,
      answer: `${val}`
    };
  },
  // find which term equals a value
  () => {
    const d = randInt(1,8), c = randInt(-5,5);
    const n = randInt(4,15);
    const val = d*n + c;
    return {
      text: `The nth term of a sequence is ${d}n+${c}. Which term has the value ${val}?`,
      answer: `${n}`
    };
  },
  // is a value in the sequence?
  () => {
    const d = randInt(2,6), c = randInt(0,5);
    const inSeq = Math.random() < 0.5;
    let val;
    if (inSeq) { val = d * randInt(3,15) + c; }
    else { do { val = randInt(d*3+c, d*15+c); } while ((val-c) % d === 0); }
    return {
      text: `The nth term of a sequence is ${d}n+${c}. Is ${val} in the sequence? Answer yes or no.`,
      answer: inSeq ? "yes" : "no"
    };
  },
  // quadratic nth term: n² + c
  () => {
    const c = randInt(1,10);
    const n = randInt(3,10);
    const terms = [1,2,3,4,5].map(k => k*k + c);
    return {
      text: `A sequence has nth term n^2+${c}. The first five terms are ${terms.join(", ")}. What is the ${n}th term?`,
      answer: `${n*n + c}`
    };
  }
];

// ---- Yellow 3: Circle facts ----
const y_circleFacts = [
  // circumference given radius
  () => {
    const r = randInt(2, 15);
    const c = Math.round(2 * Math.PI * r * 100) / 100;
    return {
      text: `Find the circumference of a circle with radius ${r}cm. Use π=3.14 and round to 2dp.`,
      answer: `${Math.round(2 * 3.14 * r * 100) / 100}cm`
    };
  },
  // area given radius
  () => {
    const r = randInt(2, 12);
    return {
      text: `Find the area of a circle with radius ${r}cm. Use π=3.14 and round to 2dp.`,
      answer: `${Math.round(3.14 * r * r * 100) / 100}cm²`
    };
  },
  // radius from diameter
  () => {
    const d = randInt(4, 30) * 2;
    return {
      text: `A circle has a diameter of ${d}cm. What is its radius?`,
      answer: `${d/2}cm`
    };
  },
  // diameter from circumference
  () => {
    const d = randInt(4, 20);
    const c = Math.round(d * 3.14 * 100) / 100;
    return {
      text: `A circle has a circumference of ${c}cm. Using π=3.14, find the diameter to 2dp.`,
      answer: `${d}cm`
    };
  }
];

// ---- Yellow 4: Advanced angle facts ----
const y_advAngleFacts = [
  () => {
    const facts = [
      ["The angle in a semicircle is always _____ degrees.", "90"],
      ["The angle at the centre is _____ the angle at the circumference subtended by the same arc.", "twice"],
      ["Angles in the same segment of a circle are _____.", "equal"],
      ["Opposite angles in a cyclic quadrilateral add up to _____ degrees.", "180"],
      ["A tangent to a circle is always _____ to the radius at the point of contact.", "perpendicular"],
      ["The angle between a tangent and a chord equals the angle in the _____ segment.", "alternate"],
      ["Two tangents drawn from an external point to a circle are equal in _____.", "length"]
    ];
    const f = randChoice(facts);
    return { text: `Fill in the blank: ${f[0]}`, answer: f[1] };
  },
  // angle at centre vs circumference
  () => {
    const centre = randInt(40, 160);
    return {
      text: `An arc subtends an angle of ${centre} degrees at the centre of a circle. What angle does it subtend at the circumference?`,
      answer: `${centre / 2}`
    };
  },
  // cyclic quadrilateral opposite angles
  () => {
    const a = randInt(40, 140);
    return {
      text: `A cyclic quadrilateral has one angle of ${a} degrees. What is the opposite angle?`,
      answer: `${180 - a}`
    };
  },
  // angle in semicircle
  () => {
    const a = randInt(10, 79);
    return {
      text: `A triangle is inscribed in a semicircle with the hypotenuse as the diameter. One of the acute angles is ${a} degrees. What is the other?`,
      answer: `${90 - a}`
    };
  }
];

// ---- Yellow 5: Advanced angle calculations ----
const y_advAngleCalc = [
  // angle at centre given angle at circumference
  () => {
    const circ = randInt(20, 80);
    return {
      text: `An arc subtends an angle of ${circ} degrees at the circumference. What angle does it subtend at the centre?`,
      answer: `${circ * 2}`
    };
  },
  // find angle in cyclic quadrilateral given three
  () => {
    const a = randInt(60, 100), b = randInt(60, 100);
    const c = 180 - a;
    const d = 180 - b;
    return {
      text: `A cyclic quadrilateral has angles ${a}, ${b} and ${c} degrees (in order). Find the fourth angle.`,
      answer: `${d}`
    };
  },
  // tangent-radius right angle
  () => {
    const a = randInt(20, 70);
    return {
      text: `A tangent touches a circle at point P. The radius to P and the tangent form a right angle. If another angle in the triangle formed is ${a} degrees, find the third angle.`,
      answer: `${90 - a}`
    };
  },
  // alternate segment theorem
  () => {
    const a = randInt(20, 70);
    return {
      text: `Using the alternate segment theorem: a chord makes an angle of ${a} degrees with a tangent at one end. What is the angle in the alternate segment?`,
      answer: `${a}`
    };
  }
];

// ---- Yellow 6: Probability ----
const y_probability = [
  // basic: P(event) = favourable/total
  () => {
    const total = randChoice([4,5,6,8,10,12,20]);
    const fav = randInt(1, total-1);
    const [sn,sd] = simplifyFraction(fav, total);
    return {
      text: `A bag contains ${total} balls. ${fav} of them are red. What is the probability of picking a red ball at random? Give your answer as a simplified fraction.`,
      answer: `${sn}/${sd}`
    };
  },
  // complementary probability
  () => {
    const total = randChoice([4,5,6,8,10,12,20]);
    const fav = randInt(1, total-1);
    const [sn,sd] = simplifyFraction(fav, total);
    const [cn,cd] = simplifyFraction(total-fav, total);
    return {
      text: `The probability of an event occurring is ${sn}/${sd}. What is the probability it does NOT occur?`,
      answer: `${cn}/${cd}`
    };
  },
  // expected frequency
  () => {
    const total = randInt(20, 200);
    const den = randChoice([4,5,8,10]);
    const num = randInt(1, den-1);
    const expected = Math.round(total * num / den);
    return {
      text: `The probability of an event is ${num}/${den}. If the experiment is carried out ${total} times, how many times is the event expected to occur?`,
      answer: `${expected}`
    };
  },
  // combined events: P(A and B) = P(A) × P(B) independent
  () => {
    const den1 = randChoice([2,3,4,5,6]);
    const num1 = randInt(1, den1-1);
    const den2 = randChoice([2,3,4,5,6]);
    const num2 = randInt(1, den2-1);
    const [sn,sd] = simplifyFraction(num1*num2, den1*den2);
    return {
      text: `Two independent events have probabilities ${num1}/${den1} and ${num2}/${den2}. What is the probability both occur?`,
      answer: `${sn}/${sd}`
    };
  },
  // P(A or B) for mutually exclusive
  () => {
    const den = randChoice([6,8,10,12]);
    const num1 = randInt(1,3);
    const num2 = randInt(1,3);
    if (num1+num2 >= den) return { text:`P(A)=1/4 and P(B)=1/4. P(A or B)?`, answer:`1/2` };
    const [sn,sd] = simplifyFraction(num1+num2, den);
    return {
      text: `Two mutually exclusive events have probabilities ${num1}/${den} and ${num2}/${den}. What is P(A or B)?`,
      answer: `${sn}/${sd}`
    };
  }
];

// ---- Yellow 7: Transformations ----
const y_transformations = [
  // translation by vector
  () => {
    const x = randInt(-5,5), y = randInt(-5,5);
    const dx = randInt(-5,5), dy = randInt(-5,5);
    return {
      text: `A point at (${x},${y}) is translated by the vector (${dx},${dy}). What are the new coordinates?`,
      answer: `(${x+dx},${y+dy})`
    };
  },
  // reflection in x-axis
  () => {
    const x = randInt(-8,8), y = randInt(-8,8);
    return {
      text: `Reflect the point (${x},${y}) in the x-axis. What are the new coordinates?`,
      answer: `(${x},${-y})`
    };
  },
  // reflection in y-axis
  () => {
    const x = randInt(-8,8), y = randInt(-8,8);
    return {
      text: `Reflect the point (${x},${y}) in the y-axis. What are the new coordinates?`,
      answer: `(${-x},${y})`
    };
  },
  // rotation 90° clockwise about origin: (x,y) → (y,-x)
  () => {
    const x = randInt(-6,6), y = randInt(-6,6);
    return {
      text: `Rotate the point (${x},${y}) by 90 degrees clockwise about the origin. What are the new coordinates?`,
      answer: `(${y},${-x})`
    };
  },
  // rotation 180° about origin: (x,y) → (-x,-y)
  () => {
    const x = randInt(-6,6), y = randInt(-6,6);
    return {
      text: `Rotate the point (${x},${y}) by 180 degrees about the origin. What are the new coordinates?`,
      answer: `(${-x},${-y})`
    };
  },
  // enlargement: scale factor
  () => {
    const sf = randChoice([2,3,4,0.5]);
    const x = randInt(1,6), y = randInt(1,6);
    return {
      text: `Enlarge the point (${x},${y}) by scale factor ${sf} from the origin. What are the new coordinates?`,
      answer: `(${x*sf},${y*sf})`
    };
  },
  // identify transformation from before/after
  () => {
    const type = randChoice(["x-axis reflection","y-axis reflection","180° rotation"]);
    const x = randInt(1,8), y = randInt(1,8);
    let nx, ny, desc;
    if (type === "x-axis reflection") { nx=x; ny=-y; desc="x-axis"; }
    else if (type === "y-axis reflection") { nx=-x; ny=y; desc="y-axis"; }
    else { nx=-x; ny=-y; desc="origin"; }
    return {
      text: `A point at (${x},${y}) moves to (${nx},${ny}). Was it reflected in the x-axis, reflected in the y-axis, or rotated 180° about the origin?`,
      answer: type
    };
  }
];

// ---- assemble Master ----
questions.master = [
  // 12 hardest Green topics
  m_angleCalc,
  m_averages,
  m_convert,
  m_expand,
  m_findX,
  m_likeTerms,
  m_powersRoots,
  m_primesFactors,
  m_ratio,
  m_recurring,
  m_simplifying,
  m_axes,
  // 7 easiest Yellow topics
  y_fibonacci,
  y_nthTerm,
  y_circleFacts,
  y_advAngleFacts,
  y_advAngleCalc,
  y_probability,
  y_transformations
];

// ============================================================
// EASY DENYS — All 13 Yellow topics + All 5 Red topics (Pi excluded)
// ============================================================

// ---- Yellow 8: Pythagoras' Theorem ----
const PYTH_TRIPLES = [[3,4,5],[5,12,13],[6,8,10],[8,15,17],[7,24,25],[9,12,15],[9,40,41]];

const y_pythagoras = [
  // find hypotenuse
  () => {
    const [a,b,c] = randChoice(PYTH_TRIPLES);
    return {
      text: `A right-angled triangle has legs of ${a}cm and ${b}cm. Find the hypotenuse.`,
      answer: `${c}cm`
    };
  },
  // find a leg
  () => {
    const [a,b,c] = randChoice(PYTH_TRIPLES.slice(0,5));
    const showA = Math.random() < 0.5;
    return {
      text: `A right-angled triangle has hypotenuse ${c}cm and one leg of ${showA?a:b}cm. Find the other leg.`,
      answer: `${showA?b:a}cm`
    };
  },
  // is it right-angled?
  () => {
    const [a,b,c] = randChoice(PYTH_TRIPLES.slice(0,4));
    const isRight = Math.random() < 0.5;
    const wrongC = c + (isRight ? 0 : randChoice([1,2,3]));
    return {
      text: `Does a triangle with sides ${a}cm, ${b}cm and ${wrongC}cm satisfy Pythagoras' theorem? Answer yes or no.`,
      answer: isRight ? "yes" : "no"
    };
  },
  // distance between two points (applied Pythagoras)
  () => {
    const [dx,dy,dist] = randChoice([[3,4,5],[5,12,13],[6,8,10],[8,15,17]]);
    const x1=randInt(-5,5), y1=randInt(-5,5);
    const sx=randChoice([-1,1]), sy=randChoice([-1,1]);
    return {
      text: `Find the distance between (${x1},${y1}) and (${x1+dx*sx},${y1+dy*sy}).`,
      answer: `${dist}`
    };
  },
  // word problem using Pythagoras
  () => {
    const [a,b,c] = randChoice([[3,4,5],[5,12,13],[6,8,10]]);
    return {
      text: `A ladder of length ${c}m leans against a wall. Its foot is ${a}m from the wall. How high up the wall does the ladder reach?`,
      answer: `${b}m`
    };
  }
];

// ---- Yellow 9: 3D Pythagoras' Theorem ----
// Pythagorean quadruples: a²+b²+c²=d²
const PYTH_QUADS = [[1,2,2,3],[2,3,6,7],[1,4,8,9],[2,6,9,11],[6,6,7,11],[2,10,11,15]];

const y_3dPythagoras = [
  // space diagonal of a cuboid
  () => {
    const [a,b,c,d] = randChoice(PYTH_QUADS);
    return {
      text: `A cuboid has dimensions ${a}cm × ${b}cm × ${c}cm. Find the length of the space diagonal.`,
      answer: `${d}cm`
    };
  },
  // diagonal of a face then height — chained so the face diagonal (itself a
  // clean hypotenuse from one triple) is also a clean leg in a second triple,
  // keeping the space diagonal a whole number like its siblings in this topic
  () => {
    const chains = [
      { face: 5, height: 12, space: 13 },  // base 3x4 -> face 5; (5,12,13)
      { face: 15, height: 8, space: 17 }   // base 9x12 -> face 15; (8,15,17)
    ];
    const { face, height, space } = randChoice(chains);
    return {
      text: `A cuboid has a rectangular base with diagonal ${face}cm and height ${height}cm. Find the space diagonal of the cuboid.`,
      answer: `${space}cm`
    };
  },
  // find diagonal of a face
  () => {
    const [a,b,c] = randChoice(PYTH_TRIPLES.slice(0,4));
    return {
      text: `A cuboid has a base of ${a}cm × ${b}cm. What is the length of the diagonal across just the base?`,
      answer: `${c}cm`
    };
  },
  // word problem: pole in a box
  () => {
    const [a,b,c,d] = randChoice(PYTH_QUADS);
    return {
      text: `A box measures ${a}cm × ${b}cm × ${c}cm. What is the longest straight pole that will fit inside the box?`,
      answer: `${d}cm`
    };
  }
];

// ---- Yellow 10: Quadratic Equation ----
const y_quadratic = [
  // solve by factorising (integer roots)
  () => {
    const r1 = randInt(-8,8), r2 = randInt(-8,8);
    const b = -(r1+r2), c = r1*r2;
    const bStr = b===0?"":b>0?`+${b}x`:`${b}x`;
    const cStr = c===0?"":c>0?`+${c}`:`${c}`;
    const roots = [...new Set([r1,r2])].sort((a,b)=>a-b);
    return {
      text: `Solve x^2${bStr}${cStr}=0 by factorising.`,
      answer: roots.join(", ")
    };
  },
  // discriminant and number of roots
  () => {
    const type = randChoice(["two","one","none"]);
    let a=1, b, c, disc;
    if (type==="two") { b=randInt(-6,6); do { c=randInt(-8,4); disc=b*b-4*c; } while(disc<=0); }
    else if (type==="one") { b=randChoice([-6,-4,-2,2,4,6]); c=b*b/4; disc=0; }
    else { b=0; c=randInt(1,10); disc=-4*c; }
    const cStr = c===0?"":c>0?`+${c}`:`${c}`;
    const bStr = b===0?"":b>0?`+${b}x`:`${b}x`;
    return {
      text: `How many real roots does x^2${bStr}${cStr}=0 have? (discriminant b²-4ac = ${disc})`,
      answer: type==="two"?"two real roots":type==="one"?"one repeated root":"no real roots"
    };
  },
  // complete the square
  () => {
    const h = randInt(-5,5), k = randInt(-10,10);
    const b = 2*h, c = h*h+k;
    const bStr = b===0?"":b>0?`+${b}`:`${b}`;
    const cStr = c===0?"":c>0?`+${c}`:`${c}`;
    const innerStr = h===0?"":(h>0?`+${h}`:`${h}`);
    const kStr = k===0?"":k>0?`+${k}`:`${k}`;
    return {
      text: `Write x^2${bStr}x${cStr} in the form (x+p)^2+q.`,
      answer: `(x${innerStr})^2${kStr}`
    };
  },
  // quadratic formula (non-factorisable, decimal answer)
  () => {
    const b = randChoice([-5,-3,3,5]), c = randChoice([-4,-3,-2,-1]);
    const disc = b*b - 4*c;
    const r1 = Math.round((-b + Math.sqrt(disc))/2 * 100)/100;
    const r2 = Math.round((-b - Math.sqrt(disc))/2 * 100)/100;
    const cStr = c<0?`${c}`:`+${c}`;
    const bStr = b<0?`${b}x`:`+${b}x`;
    return {
      text: `Use the quadratic formula to solve x^2${bStr}${cStr}=0. Give your answers to 2dp.`,
      answer: `${Math.max(r1,r2)}, ${Math.min(r1,r2)}`
    };
  }
];

// ---- Yellow 11: Logics ----
const y_logics = [
  // AND gate
  () => {
    const A = randChoice([true,false]), B = randChoice([true,false]);
    return {
      text: `In logic, what is ${A?"TRUE":"FALSE"} AND ${B?"TRUE":"FALSE"}?`,
      answer: (A&&B)?"TRUE":"FALSE"
    };
  },
  // OR gate
  () => {
    const A = randChoice([true,false]), B = randChoice([true,false]);
    return {
      text: `In logic, what is ${A?"TRUE":"FALSE"} OR ${B?"TRUE":"FALSE"}?`,
      answer: (A||B)?"TRUE":"FALSE"
    };
  },
  // NOT gate
  () => {
    const A = randChoice([true,false]);
    return {
      text: `In logic, what is NOT ${A?"TRUE":"FALSE"}?`,
      answer: (!A)?"TRUE":"FALSE"
    };
  },
  // modus ponens
  () => {
    const args = [
      {p1:"All mammals breathe air",p2:"Whales are mammals",c:"Whales breathe air"},
      {p1:"All squares are rectangles",p2:"ABCD is a square",c:"ABCD is a rectangle"},
      {p1:"All prime numbers greater than 2 are odd",p2:"7 is a prime greater than 2",c:"7 is odd"},
      {p1:"All multiples of 6 are even",p2:"42 is a multiple of 6",c:"42 is even"}
    ];
    const {p1,p2,c} = randChoice(args);
    return {
      text: `Given: "${p1}" and "${p2}". What logical conclusion follows?`,
      answer: c
    };
  },
  // sets: union and intersection
  () => {
    const poolA = [1,2,3,4,5], poolB = [3,4,5,6,7];
    const A = poolA.slice(0, randInt(3,5));
    const B = poolB.slice(0, randInt(3,5));
    const type = randChoice(["union","intersection"]);
    if (type==="union") {
      const union = [...new Set([...A,...B])].sort((a,b)=>a-b);
      return {
        text: `Set A = {${A.join(",")}} and Set B = {${B.join(",")}}. What is A ∪ B?`,
        answer: `{${union.join(",")}}`
      };
    }
    const inter = A.filter(x=>B.includes(x));
    return {
      text: `Set A = {${A.join(",")}} and Set B = {${B.join(",")}}. What is A ∩ B?`,
      answer: inter.length===0?"∅":`{${inter.join(",")}}`
    };
  },
  // set complement notation
  () => {
    const total = [1,2,3,4,5,6,7,8,9,10];
    const nA = randInt(3,7);
    const A = total.slice(0,nA);
    const complement = total.filter(x=>!A.includes(x));
    return {
      text: `The universal set is {1,2,...,10} and A = {${A.join(",")}}. What is A' (the complement of A)?`,
      answer: `{${complement.join(",")}}`
    };
  }
];

// ---- Yellow 12: sin, cos and tan ----
const TRIG_TABLE = [
  {deg:30,fn:"sin",val:"0.5"},
  {deg:30,fn:"cos",val:"0.866"},
  {deg:30,fn:"tan",val:"0.577"},
  {deg:45,fn:"sin",val:"0.707"},
  {deg:45,fn:"cos",val:"0.707"},
  {deg:45,fn:"tan",val:"1"},
  {deg:60,fn:"sin",val:"0.866"},
  {deg:60,fn:"cos",val:"0.5"},
  {deg:60,fn:"tan",val:"1.732"},
];

const y_sinCosTan = [
  // exact value lookup
  () => {
    const {deg,fn,val} = randChoice(TRIG_TABLE);
    return {
      text: `What is ${fn}(${deg}°)? Give your answer to 3 decimal places.`,
      answer: val
    };
  },
  // SOH: opposite from hypotenuse + angle 30° (sin=0.5 exact)
  () => {
    const hyp = randChoice([6,8,10,12,14,16,20]);
    return {
      text: `In a right-angled triangle, the hypotenuse is ${hyp}cm and the angle is 30°. Find the opposite side. (sin 30° = 0.5)`,
      answer: `${hyp*0.5}cm`
    };
  },
  // CAH: adjacent from hypotenuse + angle 60° (cos=0.5 exact)
  () => {
    const hyp = randChoice([6,8,10,12,14,16,20]);
    return {
      text: `In a right-angled triangle, the hypotenuse is ${hyp}cm and the angle is 60°. Find the adjacent side. (cos 60° = 0.5)`,
      answer: `${hyp*0.5}cm`
    };
  },
  // TOA: angle from equal sides (tan=1, angle=45°)
  () => {
    const side = randChoice([3,4,5,6,7,8]);
    return {
      text: `In a right-angled triangle, the opposite and adjacent sides are both ${side}cm. Find the angle using tan.`,
      answer: `45°`
    };
  },
  // hypotenuse from opposite + angle 30° (hyp = opp/sin30 = opp/0.5 = 2*opp)
  () => {
    const opp = randChoice([3,4,5,6,7,8]);
    return {
      text: `In a right-angled triangle, the angle is 30° and the opposite side is ${opp}cm. Find the hypotenuse. (sin 30° = 0.5)`,
      answer: `${opp*2}cm`
    };
  },
  // label: which is SOH/CAH/TOA for a given scenario
  () => {
    const rule = randChoice([
      {q:"To find the opposite when you have the hypotenuse and the angle, you use:", a:"SOH (sin = opposite / hypotenuse)"},
      {q:"To find the adjacent when you have the hypotenuse and the angle, you use:", a:"CAH (cos = adjacent / hypotenuse)"},
      {q:"To find the opposite when you have the adjacent and the angle, you use:", a:"TOA (tan = opposite / adjacent)"}
    ]);
    return { text: rule.q, answer: rule.a };
  }
];

// ---- Yellow 13: Circle calculations ----
const y_circleCalc = [
  // arc length: (θ/360) × 2πr
  () => {
    const r = randInt(3,12);
    const angle = randChoice([30,45,60,90,120,135,180]);
    const arc = Math.round(angle/360 * 2 * 3.14 * r * 100)/100;
    return {
      text: `Find the arc length of a sector with radius ${r}cm and angle ${angle}°. Use π=3.14 and round to 2dp.`,
      answer: `${arc}cm`
    };
  },
  // area of sector: (θ/360) × πr²
  () => {
    const r = randInt(3,10);
    const angle = randChoice([30,45,60,90,120,135,180]);
    const area = Math.round(angle/360 * 3.14 * r*r * 100)/100;
    return {
      text: `Find the area of a sector with radius ${r}cm and angle ${angle}°. Use π=3.14 and round to 2dp.`,
      answer: `${area}cm²`
    };
  },
  // perimeter of sector: arc + 2r
  () => {
    const r = randInt(3,10);
    const angle = randChoice([30,60,90,120,180]);
    const arc = Math.round(angle/360 * 2 * 3.14 * r * 100)/100;
    const perim = Math.round((arc + 2*r)*100)/100;
    return {
      text: `Find the perimeter of a sector with radius ${r}cm and angle ${angle}°. Use π=3.14 and round to 2dp.`,
      answer: `${perim}cm`
    };
  },
  // find angle from arc length and radius
  () => {
    const r = randChoice([5,10]);
    const angle = randChoice([36,72,90,108,144]);
    const arc = Math.round(angle/360 * 2 * 3.14 * r * 100)/100;
    return {
      text: `A sector has radius ${r}cm and arc length ${arc}cm. Find its angle. Use π=3.14.`,
      answer: `${angle}°`
    };
  },
  // find radius from area of sector
  () => {
    const r = randChoice([3,4,5,6,8,10]);
    const angle = randChoice([90,180]);
    const area = Math.round(angle/360 * 3.14 * r*r * 100)/100;
    return {
      text: `A sector has angle ${angle}° and area ${area}cm². Find the radius. Use π=3.14.`,
      answer: `${r}cm`
    };
  }
];

// ============================================================
// RED TOPICS (Pi excluded)
// ============================================================

// ---- Red 1: Advanced circle calculations ----
const r_advCircleCalc = [
  // annulus: π(R²-r²)
  () => {
    const R = randInt(6,15), r = randInt(2, Math.min(R-2, 8));
    const area = Math.round(3.14*(R*R - r*r)*100)/100;
    return {
      text: `An annulus has outer radius ${R}cm and inner radius ${r}cm. Find its area. Use π=3.14 and round to 2dp.`,
      answer: `${area}cm²`
    };
  },
  // circle inscribed in square: shaded area outside circle
  () => {
    const r = randChoice([3,4,5,6,7]);
    const side = 2*r;
    const shaded = Math.round((side*side - 3.14*r*r)*100)/100;
    return {
      text: `A circle of radius ${r}cm is inscribed in a square with side ${side}cm. Find the shaded area outside the circle. Use π=3.14 and round to 2dp.`,
      answer: `${shaded}cm²`
    };
  },
  // find arc length given area of sector and radius
  () => {
    const r = randChoice([5,6,8,10]);
    const angle = randChoice([60,90,120,180]);
    const arc = Math.round(angle/360 * 2 * 3.14 * r * 100)/100;
    const sectorArea = Math.round(angle/360 * 3.14 * r*r * 100)/100;
    return {
      text: `A sector has radius ${r}cm and area ${sectorArea}cm². Find the arc length. Use π=3.14.`,
      answer: `${arc}cm`
    };
  },
  // segment area: sector area - triangle area
  () => {
    const r = randChoice([5,6,8,10]);
    const angle = 90;
    const sectorArea = Math.round(angle/360 * 3.14 * r*r * 100)/100;
    const triArea = Math.round(0.5 * r * r * 100)/100;
    const segArea = Math.round((sectorArea - triArea)*100)/100;
    return {
      text: `A sector has radius ${r}cm and angle 90°. Find the area of the segment (sector minus triangle). Use π=3.14 and round to 2dp.`,
      answer: `${segArea}cm²`
    };
  },
];

// ---- Red 2: Advanced ultimate logics ----
const r_advLogics = [
  // XOR
  () => {
    const A = randChoice([true,false]), B = randChoice([true,false]);
    const xor = (A||B) && !(A&&B);
    return {
      text: `What is ${A?"TRUE":"FALSE"} XOR ${B?"TRUE":"FALSE"}? (XOR: true only when exactly one input is true)`,
      answer: xor?"TRUE":"FALSE"
    };
  },
  // De Morgan's laws
  () => {
    const law = randChoice([1,2]);
    if (law===1) return {
      text: `De Morgan's first law: NOT(A AND B) = NOT A ___ NOT B. Fill in the blank.`,
      answer: "OR"
    };
    return {
      text: `De Morgan's second law: NOT(A OR B) = NOT A ___ NOT B. Fill in the blank.`,
      answer: "AND"
    };
  },
  // contrapositive
  () => {
    const stmts = [
      {if:"it is raining", then:"the ground is wet", contra:"the ground is not wet, then it is not raining"},
      {if:"a shape is a square", then:"it is a rectangle", contra:"a shape is not a rectangle, then it is not a square"},
      {if:"x is even", then:"x² is even", contra:"x² is not even, then x is not even"}
    ];
    const {if:p, then:q, contra} = randChoice(stmts);
    return {
      text: `"If ${p}, then ${q}." What is the contrapositive of this statement? Finish: "If ${contra.split(", then ")[0]}, then ..."`,
      answer: contra
    };
  },
  // syllogism validity
  () => {
    const valid = randChoice([true,false]);
    if (valid) return {
      text: `Is this valid? "All birds have wings. Penguins are birds. Therefore penguins have wings." Answer yes or no.`,
      answer: "yes"
    };
    return {
      text: `Is this valid? "All cats are animals. All dogs are animals. Therefore all cats are dogs." Answer yes or no.`,
      answer: "no"
    };
  },
  // NAND gate
  () => {
    const A = randChoice([true,false]), B = randChoice([true,false]);
    const nand = !(A&&B);
    return {
      text: `What is ${A?"TRUE":"FALSE"} NAND ${B?"TRUE":"FALSE"}? (NAND = NOT AND)`,
      answer: nand?"TRUE":"FALSE"
    };
  },
  // NOR gate
  () => {
    const A = randChoice([true,false]), B = randChoice([true,false]);
    const nor = !(A||B);
    return {
      text: `What is ${A?"TRUE":"FALSE"} NOR ${B?"TRUE":"FALSE"}? (NOR = NOT OR)`,
      answer: nor?"TRUE":"FALSE"
    };
  }
];

// ---- Red 3: Bases ----
const r_bases = [
  // decimal → binary
  () => {
    const n = randInt(1,63);
    return {
      text: `Convert the decimal number ${n} to binary (base 2).`,
      answer: n.toString(2)
    };
  },
  // binary → decimal
  () => {
    const n = randInt(1,63);
    return {
      text: `Convert the binary number ${n.toString(2)} to decimal (base 10).`,
      answer: `${n}`
    };
  },
  // decimal → hexadecimal
  () => {
    const n = randInt(1,255);
    return {
      text: `Convert the decimal number ${n} to hexadecimal (base 16).`,
      answer: n.toString(16).toUpperCase()
    };
  },
  // hexadecimal → decimal
  () => {
    const n = randInt(1,255);
    return {
      text: `Convert the hexadecimal number ${n.toString(16).toUpperCase()} to decimal (base 10).`,
      answer: `${n}`
    };
  },
  // decimal → octal
  () => {
    const n = randInt(1,63);
    return {
      text: `Convert the decimal number ${n} to octal (base 8).`,
      answer: n.toString(8)
    };
  },
  // octal → decimal
  () => {
    const n = randInt(1,63);
    return {
      text: `Convert the octal number ${n.toString(8)} to decimal (base 10).`,
      answer: `${n}`
    };
  },
  // add two binary numbers
  () => {
    const a = randInt(1,15), b = randInt(1,15);
    return {
      text: `Add the binary numbers ${a.toString(2)} and ${b.toString(2)}. Give your answer in binary.`,
      answer: (a+b).toString(2)
    };
  },
  // what base is used for this system?
  () => {
    const facts = [
      {q:"How many digits are used in binary?", a:"2"},
      {q:"How many digits are used in octal?", a:"8"},
      {q:"How many digits/symbols are used in hexadecimal?", a:"16"},
      {q:"What is the base of the decimal system we use every day?", a:"10"},
      {q:"In hexadecimal, what decimal value does the letter A represent?", a:"10"},
      {q:"In hexadecimal, what decimal value does the letter F represent?", a:"15"}
    ];
    const {q,a} = randChoice(facts);
    return { text: q, answer: a };
  }
];

// ---- Red 4: Tetrations and Pentations ----
function tetrate(a, n) {
  if (n === 0) return 1;
  if (n === 1) return a;
  let result = a;
  for (let i = 1; i < n; i++) result = Math.pow(a, result);
  return result;
}

const SAFE_TETRATIONS = [
  {a:2,n:1,val:2},{a:2,n:2,val:4},{a:2,n:3,val:16},{a:2,n:4,val:65536},
  {a:3,n:1,val:3},{a:3,n:2,val:27},{a:4,n:1,val:4},{a:4,n:2,val:256},
  {a:5,n:1,val:5},{a:5,n:2,val:3125},{a:10,n:1,val:10},{a:10,n:2,val:1e10}
];

const r_tetrations = [
  // basic tetration value
  () => {
    const {a,n,val} = randChoice(SAFE_TETRATIONS.filter(t=>t.val<=65536));
    return {
      text: `Calculate ${a}^^${n} (${a} tetrated to ${n}: a power tower of ${n} copies of ${a}).`,
      answer: `${val}`
    };
  },
  // expand the power tower
  () => {
    const {a,n,val} = randChoice([{a:2,n:3,val:16},{a:3,n:2,val:27},{a:2,n:2,val:4}]);
    const tower = n===2?`${a}^${a}`:n===3?`${a}^(${a}^${a})`:`${a}`;
    return {
      text: `Write out the full power tower for ${a}^^${n}, then calculate it.`,
      answer: `${tower} = ${val}`
    };
  },
  // compare tetration to exponentiation
  () => {
    const a = randChoice([2,3]);
    const b = a===2?4:3;
    const expVal = Math.pow(a,b);
    const tetVal = tetrate(a,2);
    return {
      text: `${a}^${b} = ${expVal}. What is ${a}^^2 (${a} tetrated to 2)?`,
      answer: `${tetVal}`
    };
  },
  // pentation: a^^^n (only trivially small values)
  () => {
    const entry = randChoice([
      {a:2,n:1,val:2,desc:"2^^^1 = 2"},
      {a:2,n:2,val:4,desc:"2^^^2 = 2^^2 = 4"},
      {a:3,n:1,val:3,desc:"3^^^1 = 3"}
    ]);
    return {
      text: `Calculate ${entry.a}^^^${entry.n} (pentation). ${entry.desc.split("=")[0].trim()} = ?`,
      answer: `${entry.val}`
    };
  },
  // ordering: which is bigger?
  () => {
    const pairs = [
      {a:"2^10",b:"2^^3",va:1024,vb:16,bigger:"2^10"},
      {a:"3^^2",b:"2^^4",va:27,vb:65536,bigger:"2^^4"},
      {a:"2^^3",b:"3^4",va:16,vb:81,bigger:"3^4"}
    ];
    const {a,b,bigger} = randChoice(pairs);
    return {
      text: `Which is bigger: ${a} or ${b}?`,
      answer: bigger
    };
  }
];

// ---- Red 5: Inequalities ----
const r_inequalities = [
  // basic linear inequality
  () => {
    const a = randInt(2,8), xInt = randInt(1,10), b = randInt(1,20);
    const c = a*xInt + b;
    const op = randChoice(["<",">","≤","≥"]);
    const ansOp = op==="<"?"<":op===">"?">":op==="≤"?"≤":"≥";
    return {
      text: `Solve: ${a}x + ${b} ${op} ${c}`,
      answer: `x ${ansOp} ${xInt}`
    };
  },
  // negative coefficient (flip inequality)
  () => {
    const a = randInt(2,8), xInt = randInt(2,10), b = randInt(1,20);
    const c = b - a*xInt;
    const op = randChoice(["<",">"]);
    const flip = op==="<"?">":"<";
    return {
      text: `Solve: ${b} - ${a}x ${op} ${c}`,
      answer: `x ${flip} ${xInt}`
    };
  },
  // double (compound) inequality
  () => {
    const a = randInt(2,5), b = randInt(1,10);
    const x1 = randInt(-3,0), x2 = randInt(1,5);
    const lower = a*x1+b, upper = a*x2+b;
    return {
      text: `Solve: ${lower} < ${a}x + ${b} < ${upper}`,
      answer: `${x1} < x < ${x2}`
    };
  },
  // number line description
  () => {
    const a = randInt(1,10);
    const op = randChoice(["<",">","≤","≥"]);
    const filled = op==="≤"||op==="≥";
    const dir = op==="<"||op==="≤"?"left":"right";
    return {
      text: `Describe how you would show x ${op} ${a} on a number line.`,
      answer: `${filled?"filled":"open"} circle at ${a}, arrow pointing ${dir}`
    };
  },
  // inequality from context
  () => {
    const min = randChoice([5,10,16,18]);
    const letter = randChoice(["a","n","x","y"]);
    return {
      text: `Write an inequality for: "${letter} must be at least ${min}".`,
      answer: `${letter} ≥ ${min}`
    };
  }
];

// ---- assemble Easy Denys ----
questions.easyDenys = [
  // All 13 yellow topics
  y_fibonacci,
  y_nthTerm,
  y_circleFacts,
  y_advAngleFacts,
  y_advAngleCalc,
  y_probability,
  y_transformations,
  y_pythagoras,
  y_3dPythagoras,
  y_quadratic,
  y_logics,
  y_sinCosTan,
  y_circleCalc,
  // All 5 red topics (Pi excluded)
  r_advCircleCalc,
  r_advLogics,
  r_bases,
  r_tetrations,
  r_inequalities
];

// ============================================================
// ULTIMATE DENYS — All Yellow + All Red (including Pi) + Purple
// ============================================================

// ---- Red 0: Pi (first 100 decimal digits) ----
// π = 3.14159265358979323846264338327950288419716939937510
//       58209749445923078164062862089986280348253421170679...
const PI_DIGITS = "1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679";

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

const r_pi = [
  // what is the nth digit?
  () => {
    const pos = randInt(1, 95);
    return {
      text: `What is the ${ordinal(pos)} digit of π after the decimal point? (π = 3.14159265...)`,
      answer: PI_DIGITS[pos - 1]
    };
  },
  // is the nth digit prime?
  () => {
    const pos = randInt(1, 95);
    const digit = Number(PI_DIGITS[pos - 1]);
    return {
      text: `The ${ordinal(pos)} digit of π after the decimal point is ${digit}. Is it prime? Answer yes or no.`,
      answer: isPrime(digit) ? "yes" : "no"
    };
  },
  // give three consecutive digits
  () => {
    const start = randInt(1, 93);
    const digits = PI_DIGITS.slice(start - 1, start + 2);
    return {
      text: `What are the ${ordinal(start)}, ${ordinal(start + 1)} and ${ordinal(start + 2)} digits of π after the decimal point? Write them as a 3-digit string.`,
      answer: digits
    };
  },
  // first occurrence of a given digit
  () => {
    const target = randChoice(["0","2","3","4","5","6","7","8","9"]);
    const pos = PI_DIGITS.indexOf(target) + 1;
    return {
      text: `At what position after the decimal point does the digit ${target} first appear in π (within the first 100 digits)?`,
      answer: `${pos}`
    };
  },
  // sum of digits between two positions
  () => {
    const start = randInt(1, 80);
    const end = start + randInt(2, 8);
    const sum = PI_DIGITS.slice(start - 1, end).split("").reduce((s, d) => s + Number(d), 0);
    return {
      text: `What is the sum of digits ${start} to ${end} of π after the decimal point?`,
      answer: `${sum}`
    };
  },
  // is nth digit even or odd?
  () => {
    const pos = randInt(1, 95);
    const digit = Number(PI_DIGITS[pos - 1]);
    return {
      text: `The ${ordinal(pos)} digit of π after the decimal point is ${digit}. Is it even or odd?`,
      answer: digit % 2 === 0 ? "even" : "odd"
    };
  },
  // how many times does a digit appear in first 20 digits?
  () => {
    const target = randChoice(["1","2","3","4","5","9"]);
    const count = PI_DIGITS.slice(0, 20).split("").filter(d => d === target).length;
    return {
      text: `How many times does the digit ${target} appear in the first 20 decimal digits of π (${PI_DIGITS.slice(0, 20)})?`,
      answer: `${count}`
    };
  }
];

// ---- assemble Ultimate Denys ----
questions.ultimateDenys = [
  // All 13 yellow topics
  y_fibonacci,
  y_nthTerm,
  y_circleFacts,
  y_advAngleFacts,
  y_advAngleCalc,
  y_probability,
  y_transformations,
  y_pythagoras,
  y_3dPythagoras,
  y_quadratic,
  y_logics,
  y_sinCosTan,
  y_circleCalc,
  // All 6 red topics (Pi included)
  r_pi,
  r_advCircleCalc,
  r_advLogics,
  r_bases,
  r_tetrations,
  r_inequalities
];

const helpers = {
  randInt,
  randChoice,
  randLetter,
  randTenths,
  randHundredthsAndTenths,
  gcd,
  simplifyFraction,
  midpoint,
  buildDistinctValues,
  pickThemeCategories,
  randSimplifiedFraction,
  fractionToDecimal,
  fractionToPercent,
  letterTimes,
  isPrime,
  nextPrimeAfter,
  countFactors,
  buildRatioScenario,
  CHART_THEMES,
  NICE_DENOMINATORS,
  SMALL_FACTORS,
  BIG_FACTORS,
  HCF_EXTRA,
  LCM_POOL,
  PRIME_DEF_TOKENS,
  PRIME_DEF_BLANKABLE,
  RATIO_THEMES
};

export { helpers, questions, getRandomQuestion };
