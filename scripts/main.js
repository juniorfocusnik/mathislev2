import { renderShop, renderEquipPalettePage, applyPalette } from './token-shop.js';
import { runGame } from './game-difficulties/game-engine.js';
import { logIn, logOut, watchAuthState, getAllUserTokens } from './auth.js';

function setTokens() {
  document.querySelector('.token-count').innerHTML = `TOKENS: ${tokens}<img src="icons/token.png" class="token-count-img">`;
}

// Tokens are never "unsaved" — every game win, tab-switch penalty, and shop
// purchase writes straight to localStorage, which auth.js transparently
// mirrors to the player's Firebase account in the background. There is no
// manual save step anymore.
let accountName = null;
let tokens = 0;
const urlParams = new URLSearchParams(window.location.search);

const sec = '<div class="home-secondary">';
const tit = '<div class="home-title">';
const lib = '<img class="library-image" src="images/library-images/n';
const libEnd = '.png">';

// Client-side gate for the ?page=admin token dashboard. This only hides the
// UI from casual visitors — see the "allow list" note in auth.js for why
// it isn't real server-side security.
const ADMIN_PASSWORD = "[.OFHmzaxGq9bCwb{QBc5R3%W[&TrSpMM-U.Dzrp0'wM.!yzLo";

function renderPage() {
if (accountName === null && urlParams.get('page') !== 'login' && urlParams.get('page') !== 'admin') {
  document.querySelector('main').innerHTML = `<div class="login-precaution">Please <a href="index.html?page=login">log in</a> to play Mathisle-v2. Your tokens, boosts and palettes are stored on your account.</div>`
} else if (accountName !== null && urlParams.get('page') === 'login') {
  document.querySelector('main').innerHTML = `<div class="login"><div class="login-title">Come back to the homepage!<br>You are already logged in as ${accountName}.</div></div>`
} else if (urlParams.get('page') === 'login' && accountName === null) {
  document.querySelector('main').innerHTML = `
    <div class="login"><div class="login-title">Welcome back!</div>
    <div class="login-secondary">Log in to your account below: </div>
    <input class="login-inputbox" type="text" id="login-username" placeholder="Username...">
    <input class="login-inputbox" type="password" id="login-password" placeholder="Password...">
    <div class="login-secondary" id="auth-error"></div>
    <button class="login-finish" id="do-login-btn">Log In</button></div>
  `;
  localStorage.setItem('shoutoutdone', 'false');
  applyPalette("default");
} else if (urlParams.get('page') === 'admin') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Admin: Token Dashboard</div>
        ${sec}Enter the admin password to view everyone's token counts.</div>
        <input class="login-inputbox" type="password" id="admin-password" placeholder="Admin password...">
        <button class="login-finish" id="admin-unlock-btn">Unlock</button>
        <div class="login-secondary" id="admin-error"></div>
        <div id="admin-results"></div>
      </div>
  `;
  document.querySelector('#admin-unlock-btn').addEventListener('click', async () => {
    const entered = document.querySelector('#admin-password').value;
    const errorEl = document.querySelector('#admin-error');
    const resultsEl = document.querySelector('#admin-results');
    errorEl.textContent = '';
    if (entered !== ADMIN_PASSWORD) {
      errorEl.textContent = 'Incorrect password.';
      return;
    }
    resultsEl.innerHTML = 'Loading...';
    try {
      const users = await getAllUserTokens();
      resultsEl.innerHTML = `
        <table class="admin-table">
          <tr><th>Name</th><th>Tokens</th></tr>
          ${users.map((u) => `<tr><td>${u.username}</td><td>${u.tokens}</td></tr>`).join('')}
        </table>
      `;
    } catch (err) {
      resultsEl.innerHTML = '';
      errorEl.textContent = `Couldn't load tokens: ${err.message}`;
    }
  });
} else if (urlParams.get('page') === 'home') {
  document.querySelector('main').innerHTML = `
      <div class="home">
      ${tit}Made by: Denys Kyrylenko</div>${sec}</div>
        <div class="home-title">Welcome to Mathisle-v2, ${accountName}! <img src="images/background-image.jpg"></div>
        <div class="home-secondary">Mathisle-v2 is a place where curiosity meets mathematics.</div>
        <div class="home-secondary">Designed for learners aged 10 and up, it offers a wide range of topics—from basic arithmetic and geometry to more advanced concepts that challenge even experienced problem-solvers.</div>
        <div class="home-secondary">For some, Mathisle-v2 is the next step after Mathisle-v1, expanding the original idea into a bigger and more powerful learning space.</div>
        <div class="home-secondary">For others, it is simply a fresh opportunity to explore mathematics in a clear and organized way.</div>
        <div class="home-secondary">Whether you are just starting out, revising key concepts, or looking for something new to think about, you will find tools, explanations, and ideas here that can help along the way.</div>
        <div class="home-secondary">Even the most confident math learners can discover something useful, interesting, or inspiring.</div>
        <div class="home-secondary">📚 Ready to begin? You can access the full Math Library in the header above ^^^ and start exploring different areas of mathematics right away.</div>
      </div>

      <div class="home">
        <div class="home-title">Explore at Your Own Pace</div>
        <div class="home-secondary">Mathisle-v2 gives you the freedom to learn at your own speed.</div>
        <div class="home-secondary">You can jump between topics, revisit concepts that feel tricky, or dive deep into challenges that make your brain stretch.</div>
        <div class="home-secondary">Every lesson, example, and puzzle is designed to build confidence, so whether you are a beginner or someone sharpening advanced skills, there is always something meaningful to engage with.</div>
      </div>

      <div class="home">
        <div class="home-title">Learn by Doing</div>
        <div class="home-secondary">Mathematics is not just about memorizing formulas—it is about thinking critically, experimenting, and solving problems.</div>
        <div class="home-secondary">Mathisle-v2 encourages hands-on practice with interactive exercises, step-by-step examples, and real-world applications.</div>
        <div class="home-secondary">You will see how numbers, shapes, and patterns connect, making math not just something you study, but something you experience and enjoy.</div>
      </div>

      <div class="home">
        <div class="home-title">For All Types of Learners</div>
        <div class="home-secondary">Everyone learns differently, and Mathisle-v2 is built to accommodate that.</div>
        <div class="home-secondary">Whether you prefer visual aids, written explanations, or interactive challenges, you will find multiple ways to grasp concepts.</div>
        <div class="home-secondary">Plus, our lessons are structured to gradually build up from simple ideas to complex reasoning, so no one gets left behind.</div>
        <div class="home-secondary">Everyone can feel the thrill of mastering new skills.</div>
      </div>

      <div class="home">
        <div class="home-title">Preparing for the Future</div>
        <div class="home-secondary">Mathisle-v2 is not just about the lessons for today—it is about building a foundation for tomorrow.</div>
        <div class="home-secondary">The skills you develop here will help with school, exams, hobbies, and even future careers in STEM fields.</div>
        <div class="home-secondary">By exploring different branches of mathematics, you are training your mind to think logically, analyze problems, and discover creative solutions.</div>
        <div class="home-secondary">These abilities go far beyond the classroom and will serve you in many areas of life.</div>
      </div>

      <div class="home">
        <div class="home-title">Work hard, win hard</div>
        <div class="home-secondary">Mathisle-v2 is not just a math learning website, it is a competitive event for prizes.</div>
        <div class="home-secondary">If you put a lot of your effort in, you might win the prize.</div>
        <div class="home-secondary">Begin learning if you have not begun already, and work hard to win a prize!</div>
      </div>
  `;
  localStorage.setItem('shoutoutdone', 'true');
} else if (urlParams.get('page') === 'library') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Here is your A-Z Math Guide, ${accountName}: <img src="images/background-image.jpg"></div>
        <div class="home-free">
          <div class="home-secondary"><a href="index.html?page=library-1">1) Primary School Calculations</a></div>
          <div class="home-secondary"><a href="index.html?page=library-2">2) Algebraic Notation</a></div>
          <div class="home-secondary"><a href="index.html?page=library-3">3) Angle calculations</a></div>
          <div class="home-secondary"><a href="index.html?page=library-4">4) Angle facts</a></div>
          <div class="home-secondary"><a href="index.html?page=library-5">5) Averages</a></div>
          <div class="home-secondary"><a href="index.html?page=library-6">6) Charts</a></div>
          <div class="home-secondary"><a href="index.html?page=library-7">7) Convert (Fractions, Decimals, Percentages)</a></div>
          <div class="home-secondary"><a href="index.html?page=library-8">8) Expand and simplify</a></div>
          <div class="home-secondary"><a href="index.html?page=library-9">9) Find X</a></div>
          <div class="home-secondary"><a href="index.html?page=library-10">10) Like terms</a></div>
          <div class="home-secondary"><a href="index.html?page=library-11">11) Multiply decimals</a></div>
          <div class="home-secondary"><a href="index.html?page=library-12">12) Percentage of</a></div>
          <div class="home-secondary"><a href="index.html?page=library-13">13) Percentage: Make</a></div>
          <div class="home-secondary"><a href="index.html?page=library-14">14) Powers and roots</a></div>
          <div class="home-secondary"><a href="index.html?page=library-15">15) Prime Numbers & Factors and LCM & HCF</a></div>
          <div class="home-secondary"><a href="index.html?page=library-16">16) Ratio</a></div>
          <div class="home-secondary"><a href="index.html?page=library-17">17) Recurring decimal into fraction</a></div>
          <div class="home-secondary"><a href="index.html?page=library-18">18) Simplifying</a></div>
          <div class="home-secondary"><a href="index.html?page=library-19">19) X-axis, Y-axis</a></div>
        </div>
        <div class="home-advanced">
          ${sec}Real Life TUTORING (15min) for 1000<img src="icons/token.png" class="token-count-img"></div>
        </div>
        <div class="home-denys">
          ${sec}Real Life TUTORING (15min) for 2000<img src="icons/token.png" class="token-count-img"></div>
        </div>
        ${sec}</div>
        ${sec}</div>
        ${sec}</div>
        ${sec}Link to buy tutoring: <a href="index.html?page=tutoring">BUY TUTORING HERE NOW!</a></div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-1') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Primary School Calculations</div>
        <div class="home-secondary">Here, we can revise every basic thing that was learnt in Primary School (Years 1-6) that is not told in the rest of this library. If you do not find the primary information required, search for it in other resources or ask me to add it.</div>
        <div class="home-secondary">Skills you need to know: </div>
        <ul>
          <li class="home-secondary">Succesion and Addition</li>
          <li class="home-secondary">Subtraction and Negatives</li>
          <li class="home-secondary">Multiplication and Division (Fractions too)</li>
          <li class="home-secondary">Adding and subtracting decimals</li>
          <li class="home-secondary">Multiplying and Dividing - Decimal to Number</li>
          <li class="home-secondary">Algebra - Basics (Box)</li>
          <li class="home-secondary">Percentages</li>
          <li class="home-secondary">Place value</li>
          <li class="home-secondary"><, > and =.</li>
          <li class="home-secondary">Prolem Solving</li>
          <li class="home-secondary"><div class="red">BIDMAS</div></li>
        </ul>
      </div>
  `;
} else if (urlParams.get('page') === 'library-2') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Algebraic Notaion</div>
        <div class="home-secondary">Algebraic notaion is a very key factor in completing algebra. Many mathematicians do not write the division symbol as it is, nor do they write (y x 7).</div>
        <div class="home-secondary">In this section of the library, we are going to explore the way of writing math algebraically when using algebra.</div>
      </div>
      <div class="home">
        <div class="home-title">Division into fraction</div>
        <div class="home-secondary"><div class="red">*Disclaimer: / might show up instead of the normal fraction over than symbol. Interpret it as a fraction!</div></div>
        <div class="home-secondary">Fractions are actually the same thing. Take a look at 1 divided by 2. The answer would be 0.5. But 0.5 is a half, so 1/2 is also a half.</div>
        <div class="home-secondary">The reason the division symbol is similar to fractions, is just replace the two dots (&#183;/&#183;) with numbers (e.g.: 1 &#183;/&#183; 2 = 1/2).</div>
        <div class="home-secondary">Mathematicans can say: "Why not? Let's convert all divisions into fractions!" So from now on, you will write: 10/5 = 2, or 333/3 = 111</div>
      </div>
      <div class="home">
        <div class="home-title">Two numbers together mean Multiply</div>
        <div class="home-secondary">In algebra, you might often see 2x, or 5(9). Or when they are filling up the slots, they put up "just-in-case" brackets like "3x x=5" turns into "3(5)". That's what you are going to know here.</div>
        <div class="home-secondary">When 2 values in math are put next to each other, it means they are being multiplied. So instead of writing the full 2 x y, mathematicians allowed to short it to 2y.</div>
        <div class="home-secondary">Now, obviously 25 is twenty-five, but if you want to use the multiplying in THIS case, you have to put 2 brackets around one of the numbers. Either (2)5 or 2(5). That is used to symbolise that these are 2 different numbers and that they have to be MULTIPLIED.</div>
        <div class="home-secondary">That is why mathematicians put "just-in-case" brackets around the number when they are changing it from a letter. so when there is an equation of 2x and you know that x = 3, you do NOT write 23, because that would mean twenty-three.</div>
        <div class="home-secondary">Instead, for good practise, when you are changing a letter to a number, ALWAYS try to put brackets around it. Even if it will not mix with other numbers. So 2x becomes 2(3).</div>
      </div>
      <div class="home">
        <div class="home-secondary">That should be everything covered! If you don't understand any notation, check out BIDMAS in <a href="index.html?page=library-1" class="bold">Primary School Calculations</a> or come up to me (Denys Kyrylenko) in school and ask!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-4') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Angle Facts</div>
        <div class="home-secondary">Angle calculations are a very important part of geometry. They help us understand shapes, lines, and how different parts of a figure relate to each other.</div>
        ${sec}In this section, we are going to explore the main rules for working with angles and how to solve problems step by step.</div>
        ${sec}<div class="red">*Disclaimer: Diagrams may not always be perfectly to scale. Use the rules, not just what it looks like!</div></div>
      </div>
      <div class="home">
        ${tit}Angles on a straight line & Triangles</div>
        ${sec}When angles lie on a straight line, they always add up to 180°. For example:</div>
        <img class="library-image" src="images/library-images/n1.png">
        ${sec}If one angle is 120°, the missing angle must be 60°, because 120° + 60° = 180°.</div>
        ${sec}There can be more than 2 angles on a straight line. So in this example:</div>
        <img class="library-image" src="images/library-images/n2.png">
        ${sec}The ? has to be 180 - (85 + 40). 85 + 40 = 125 and 180 - 125 = <div class="bold">55</div>.</div>
        ${sec}Angles in a triangle also add up to 180°.</div>
        ${lib}6${libEnd}
        ${sec}? = 180 - (50 + 60) = <div class="bold">70°</div>.</div>
      </div>
      <div class="home">
        ${tit}Angles around a point & Right angles</div>
        ${sec}This is like to straight lines because we used a half of around the point. Adding the other half, angles will now add up to <div class="bold">360°</div>.</div>
        <img class="library-image" src="images/library-images/n3.png">
        ${sec}? = 360 - (95 + 175)</div>
        ${sec} 1. 95 + 175 = 270</div>
        ${sec} 2. 360 - 270 = <div class="bold">90°</div>.</div>
        ${sec}It is time to note that 90° angles are called right angles. They are noted with a special drawing - a square instead of a circle - to tell us it is a right angle.</div>
        <img class="library-image" src="images/library-images/n4.png">
      </div>
      <div class="home">
        ${tit}Vertically opposite angles</div>
        ${sec}If two <div class="bold">STRAIGHT</div> lines intersect with each other, then the opposite angles are always equal.</div>
        <img class="library-image" src="images/library-images/n5.png">
        ${sec}In this example, a = c and b = d.</div>
      </div>
      <div class="home">
        ${tit}Angles in a quadrilateral and Angles in special shapes</div>
        ${sec}These add up to 360 degrees like angles around a point.</div>
      </div>
      <div class="home">
        ${sec}After this, I recommend you look onto <a href="index.html?page=library-3">Angle Calculations</a>.</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-3') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Angle Calculations</div>
        ${sec}<div class="red">*This is the followup to <a href="index.html?page=library-4">Angle facts</a>, so read this before you move onto here!</div></div>
        ${sec}Using your angle fact knowledge, these questions will turn up in the game! This library will just be practise questions. The answers won't be revealed, but you must know it.</div>
      </div>

      <div class="home">
        ${tit}📐 Problem 1</div>
        ${sec}Two angles lie on a straight line. One angle is (3x + 20)° and the other is (2x - 10)°.</div>
        ${sec}👉 Find the value of x, and then work out the size of each angle.</div>
      </div>

      <div class="home">
        ${tit}📐 Problem 2</div>
        ${sec}Angles around a point add up to 360°. Three angles are (x + 50)°, (2x + 10)° and (x - 20)°.</div>
        ${sec}👉 Find the value of x, then calculate each angle.</div>
      </div>

      <div class="home">
        ${tit}📐 Problem 3</div>
        ${sec}Vertically opposite angles are equal. One angle is (4x - 30)° and the opposite angle is (2x + 10)°.</div>
        ${sec}👉 Find x and the size of the angles.</div>
      </div>

      <div class="home">
        ${tit}📐 Problem 4</div>
        ${sec}Angles in a triangle add up to 180°. The angles are (x + 20)°, (2x + 30)° and (3x - 10)°.</div>
        ${sec}👉 Find x and work out all three angles.</div>
      </div>

      <div class="home">
        ${tit}📐 Problem 5</div>
        ${sec}Two angles on a straight line are (5x - 40)° and (3x + 20)°.</div>
        ${sec}👉 Find x, then find both angles.</div>
      </div>

      <div class="home">
        ${tit}📐 Problem 6</div>
        ${sec}Angles around a point are (2x + 30)°, (x + 60)°, (3x - 50)° and 40°.</div>
        ${sec}👉 Find x and then calculate all the missing angles.</div>
      </div>

      <div class="home">
        ${tit}📐 Problem 7</div>
        ${sec}Vertically opposite angles are equal. One is (6x - 20)° and the other is (3x + 40)°.</div>
        ${sec}👉 Find x and both angles.</div>
      </div>

      <div class="home">
        ${tit}📐 Problem 8</div>
        ${sec}Angles in a triangle are (2x + 10)°, (x + 30)° and (x + 20)°.</div>
        ${sec}👉 Find x and the size of each angle.</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-5') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Averages</div>
        <div class="home-secondary">Averages help us understand a set of data by finding a typical value. They are used a lot in maths and real life, such as test scores, temperatures, and sports statistics.</div>
        ${sec}In this section, we are going to explore the main types of averages and how to calculate them step by step.</div>
        ${sec}<div class="red">*Disclaimer: Always read the question carefully to know which average you need!</div></div>
      </div>

      <div class="home">
        ${tit}Mean (The most common average)</div>
        ${sec}The mean is what people usually mean when they say "average". To find it, you add up all the values and then divide by how many values there are.</div>
        ${sec}Example: Find the mean of 4, 6, 8.</div>
        ${sec}1. Add them: 4 + 6 + 8 = 18</div>
        ${sec}2. Divide by how many numbers there are (3): 18 ÷ 3 = <div class="bold">6</div>.</div>
      </div>

      <div class="home">
        ${tit}Median (The middle value)</div>
        ${sec}The median is the middle number in a list. You must put the numbers in order first!</div>
        ${sec}Example: Find the median of 3, 9, 5.</div>
        ${sec}1. Put in order: 3, 5, 9</div>
        ${sec}2. The middle number is <div class="bold">5</div>.</div>
        ${sec}If there are two middle numbers, add them and divide by 2.</div>
      </div>

      <div class="home">
        ${tit}Mode (The most frequent)</div>
        ${sec}The mode is the number that appears the most.</div>
        ${sec}Example: Find the mode of 2, 4, 4, 7.</div>
        ${sec}The number 4 appears the most, so the mode is <div class="bold">4</div>.</div>
      </div>

      <div class="home">
        ${tit}Range (Spread of data)</div>
        ${sec}The range is not an average, but it is still important. It tells us how spread out the data is.</div>
        ${sec}To find the range, subtract the smallest number from the largest number.</div>
        ${sec}Example: Find the range of 2, 5, 9.</div>
        ${sec}9 - 2 = <div class="bold">7</div>.</div>
      </div>

      <div class="home">
        ${sec}After this, try some practice questions to test your understanding of averages!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-6') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Charts</div>
        <div class="home-secondary">Charts are used to display data clearly so we can understand it more easily. They help us compare values and spot patterns.</div>
        ${sec}In this section, we will explore the main types of charts you need to know and how to read them.</div>
        ${sec}<div class="red">*Disclaimer: Always check the scale and labels on a chart before answering questions!</div></div>
      </div>

      <div class="home">
        ${tit}Bar Charts</div>
        ${sec}Bar charts use rectangular bars to show information. The height of each bar represents the value.</div>
        ${sec}Each bar is usually labelled, and there is a scale on the side.</div>
        ${sec}Example: If one bar reaches 10 on the scale, the value is 10.</div>
        ${lib}7${libEnd}
      </div>

      <div class="home">
        ${tit}Line Graphs</div>
        ${sec}Line graphs show how data changes over time. The points are plotted and then joined with straight lines.</div>
        ${sec}They are useful for showing trends, such as temperature changes over a week.</div>
        ${sec}Always read both the x-axis (horizontal) and y-axis (vertical).</div>
        ${lib}8${libEnd}
      </div>

      <div class="home">
        ${tit}Pie Charts</div>
        ${sec}Pie charts show data as parts of a whole. The full circle represents 100% or 360°.</div>
        ${sec}Each slice shows a proportion of the total.</div>
        ${sec}Bigger slices mean larger values.</div>
        ${sec}Sometimes you may need to work out angles or percentages.</div>
        ${lib}9${libEnd}
      </div>

      <div class="home">
        ${tit}Frequency Tables</div>
        ${sec}A frequency table shows how often something happens.</div>
        ${sec}It has two columns: one for the value and one for the frequency (how many times it appears). The frequency part is written in tally numbers.</div>
        ${sec}Example:</div>
        ${sec}Value: 1, 2, 3</div>
        ${sec}Frequency: 2, 5, 3</div>
        ${sec}This means 1 appears 2 times, 2 appears 5 times, and 3 appears 3 times.</div>
        ${lib}10${libEnd}
      </div>

      <div class="home">
        ${tit}Dual Bar Charts</div>
        ${sec}Dual bar charts compare two sets of data side by side.</div>
        ${sec}Each category has two bars instead of one.</div>
        ${sec}This makes it easy to compare values between two groups.</div>
        ${lib}11${libEnd}
      </div>

      <div class="home">
        ${tit}Pictograms</div>
        ${sec}Pictograms use pictures or symbols to represent data.</div>
        ${sec}Each picture stands for a certain number.</div>
        ${sec}Always check what one symbol represents before counting.</div>
        ${lib}12${libEnd}
      </div>

      <div class="home">
        ${sec}After this, you should practise reading and drawing charts to improve your understanding!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-7') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Convert (Fractions, Decimals, Percentages)</div>
        <div class="home-secondary">Converting between fractions, decimals, and percentages helps us understand numbers in different forms. It makes comparing and solving problems easier.</div>
        ${sec}In this section, we will explore how to convert between fractions, decimals, and percentages.</div>
        ${sec}<div class="red">*Disclaimer: Always check your place value and simplify your answers where possible!</div></div>
      </div>

      <div class="home">
        ${tit}Fractions to Decimals</div>
        ${sec}To convert a fraction to a decimal, make a fraction out of 10, 100, 1000 and so on, and then make it a decimal. Remember, if one of the digits' value of a number is equal to the 1's value, then it will be a whole number.</div>
        ${sec}Example: 1 ÷ 2 = <div class="green">5</div>/<div class="magenta">1</div><div class="pink">0</div> = <div class="magenta">0</div>.<div class="green">5</div></div>
        ${sec}Some fractions make exact decimals, while others are recurring.</div>
        ${lib}13${libEnd}
      </div>

      <div class="home">
        ${tit}Decimals to Fractions</div>
        ${sec}To convert a decimal to a fraction, write it over a place value (10, 100, 1000).</div>
        ${sec}Example: 0.75 = 75/100</div>
        ${sec}Then simplify the fraction if possible.</div>
        ${sec}Example: 75/100 = 3/4</div>
        ${lib}14${libEnd}
      </div>

      <div class="home">
        ${tit}Fractions to Percentages</div>
        ${sec}To convert a fraction to a percentage, first convert it to a decimal, then multiply by 100.</div>
        ${sec}Example: 1/4 = 0.25 → 25%</div>
        ${sec}You can also scale the fraction to make the denominator 100.</div>
      </div>

      <div class="home">
        ${tit}Percentages to Fractions</div>
        ${sec}To convert a percentage to a fraction, write it over 100.</div>
        ${sec}Example: 60% = 60/100</div>
        ${sec}Then simplify the fraction.</div>
        ${sec}Example: 60/100 = 3/5</div>
      </div>

      <div class="home">
        ${tit}Decimals to Percentages</div>
        ${sec}To convert a decimal to a percentage, multiply by 100.</div>
        ${sec}Example: 0.8 x 100 = 80%</div>
        ${sec}This moves the decimal point two places to the right.</div>
        ${lib}15${libEnd}
      </div>

      <div class="home">
        ${tit}Percentages to Decimals</div>
        ${sec}To convert a percentage to a decimal, divide by 100.</div>
        ${sec}Example: 45% = 0.45</div>
        ${sec}This moves the decimal point two places to the left.</div>
      </div>

      <div class="home">
        ${tit}Common Conversions</div>
        ${sec}Some conversions are useful to remember:</div>
        ${sec}1/2 = 0.5 = 50%</div>
        ${sec}1/4 = 0.25 = 25%</div>
        ${sec}3/4 = 0.75 = 75%</div>
        ${sec}1/10 = 0.1 = 10%</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise converting between fractions, decimals, and percentages to become faster and more confident!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-8') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Expand & Simplify</div>
        <div class="home-secondary">Expanding and simplifying expressions helps us work with algebra more easily. It allows us to rewrite expressions in a clearer form.</div>
        ${sec}In this section, we will learn how to expand brackets and simplify expressions.</div>
        ${sec}<div class="red">*Disclaimer: Always combine like terms and watch out for negative signs!</div></div>
      </div>

      <div class="home">
        ${tit}Expanding Brackets</div>
        ${sec}Expanding means multiplying everything inside the bracket.</div>
        ${sec}Think of this: the outside number is the crab, and it pinches the x and +2 in the example. Remember to have signs pinched as well WITH the next number!</div>
        ${sec}Example: 3(x + 2) = 3×x + 3×+2</div>
        ${sec}So the answer is 3x + +6 which is 3x + 6.</div>
        ${lib}16${libEnd}
      </div>

      <div class="home">
        ${tit}Expanding with Negatives</div>
        ${sec}Be careful when multiplying with negative numbers. They are counted as signs as well. But <div class="red">Remember!: Negative x Positive = Negative</div> and <div class="red">Negative x Negative = Positive.</div></div>
        ${sec}Example: -2(x + 3) = -2x - 6</div>
        ${sec}Each term inside the bracket is multiplied.</div>
      </div>

      <div class="home">
        ${tit}Simplifying Expressions</div>
        ${sec}Simplifying means combining like terms.</div>
        ${sec}Like terms have the same variable and power.</div>
        ${sec}Example: 2x + 3x = 5x</div>
        ${sec}This is also technically simplifying: 6 + 9 = 15.</div>
        ${lib}17${libEnd}
        ${sec}Learn more about Like Terms in <a href="index.html?page=library-12">here</a>.</div>
      </div>

      <div class="home">
        ${tit}Two Brackets (Smiley Face Variation)</div>
        ${sec}When expanding two brackets, multiply each term in the first bracket by each term in the second. So we have: x times x, x times +3, +2 times x and +2 times +3.</div>
        ${sec}Example: (x + 2)(x + 3)</div>
        ${sec}= x² + 3x + 2x + 6</div>
        ${sec}= x² + 5x + 6</div>
        /* Draw: Grid/box method or arrows showing each multiplication */
      </div>

      <div class="home">
        ${sec}After this, you should practise expanding and simplifying expressions to improve your algebra skills!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-9') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Find X</div>
        <div class="home-secondary">Finding x means solving equations. We work out the value of the unknown number that makes the equation true.</div>
        ${sec}In this section, we will learn how to solve equations by working backwards and balancing both sides.</div>
        ${sec}<div class="red">*Disclaimer: Always do the same operation to both sides of the equation!</div></div>
      </div>

      <div class="home">
        ${tit}What is x?</div>
        ${sec}x is a variable. It represents an unknown number.</div>
        ${sec}Example: x = 6 + 8</div>
        ${sec}Solve the calculation: x = 14</div>
        ${sec}</div>
        ${sec}Solve equations by doing the opposite operation.</div>
        ${sec}Example: x + 5 = 12</div>
        ${sec}Subtract 5 from both sides: x = 7</div>
      </div>

      <div class="home">
        ${tit}Reverse BIDMAS and Balancing Equations</div>
        ${sec}To solve equations, we undo operations in reverse order of BIDMAS.</div>
        ${sec}Example: 3x + 4 = 13</div>
        ${sec}First subtract 4: 3x = 9</div>
        ${sec}Then divide by 3: x = 3</div>
        ${sec}To learn more about BIDMAS, check out the <a href="index.html?page=library-1">Primary School Calculations</a>.</div>
        ${sec}</div>
        ${sec}An equation is like a balance scale.</div>
        ${sec}Whatever you do to one side, you must do to the other.</div>
        ${sec}Example: x - 3 = 10 → add 3 to both sides → x = 13</div>
      </div>

      <div class="home">
        ${tit}Multiplication and Division</div>
        ${sec}Use inverse operations to undo multiplication and division.</div>
        ${sec}Example: 4x = 20 → divide both sides by 4 → x = 5</div>
        ${sec}Example: x ÷ 2 = 6 → multiply both sides by 2 → x = 12</div>
      </div>

      <div class="home">
        ${tit}Equations with x on Both Sides</div>
        ${sec}Sometimes x appears on both sides of the equation.</div>
        ${sec}Example: 2x + 3 = x + 7</div>
        ${sec}Subtract x from both sides: x + 3 = 7</div>
        ${sec}Then solve: x = 4</div>
      </div>

      <div class="home">
        ${tit}More Steps</div>
        ${sec}Solve step-by-step using reverse BIDMAS.</div>
        ${sec}Example: 2(x + 3) = 14</div>
        ${sec}Divide by 2: x + 3 = 7</div>
        ${sec}Subtract 3: x = 4</div>
      </div>

      <div class="home">
        ${tit}Harder Equations</div>
        ${sec}Some equations include powers, roots, or fractions.</div>
        ${sec}You still solve by working step-by-step and undoing operations.</div>
        ${sec}Example: 7x² + 8 = √x + 28 ÷ 2</div>
        ${sec}Solve carefully in steps until you find x.</div>
        ${sec}Answer: x = 1</div>
      </div>

      <div class="home">
        ${tit}Check Your Answer</div>
        ${sec}Always check by substituting your answer back into the equation.</div>
        ${sec}Example: If x = 4, test it in the original equation.</div>
        ${sec}Both sides should be equal.</div>
        ${sec}So if there is x = 2 + 2, then it is correctly gotten: the x = 4.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise solving equations to become more confident at finding x!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-10') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Like Terms</div>
        <div class="home-secondary">Like terms are terms that have the same variables and powers. Understanding them helps us simplify algebraic expressions.</div>
        ${sec}In this section, we will learn how to identify and combine like terms.</div>
        ${sec}<div class="red">*Disclaimer: Only terms with exactly the same variables and powers can be combined!</div></div>
      </div>

      <div class="home">
        ${tit}What are Like Terms?</div>
        ${sec}Like terms have the same letters (variables) and the same powers.</div>
        ${sec}Example: 2x and 5x are like terms.</div>
        ${sec}Example: 3a² and 7a² are like terms.</div>
      </div>

      <div class="home">
        ${tit}Unlike Terms</div>
        ${sec}Unlike terms cannot be combined.</div>
        ${sec}Example: 2x and 3y are not like terms.</div>
        ${sec}Example: x and x² are not like terms.</div>
      </div>

      <div class="home">
        ${tit}Combining Like Terms</div>
        ${sec}To combine like terms, add or subtract the numbers in front of the variable.</div>
        ${sec}Example: 3x + 4x = 7x</div>
        ${sec}Example: 10a - 6a = 4a</div>
      </div>

      <div class="home">
        ${tit}Including Numbers</div>
        ${sec}Numbers without variables are also like terms.</div>
        ${sec}Example: 5 + 3 = 8</div>
        ${sec}Example: 2x + 3 + 4x + 1 = 6x + 4</div>
      </div>

      <div class="home">
        ${tit}Multiple Like Terms</div>
        ${sec}You can combine more than two like terms.</div>
        ${sec}Example: 2x + 3x + 5x = 10x</div>
        ${sec}Add all the coefficients together.</div>
      </div>

      <div class="home">
        ${tit}Different Variables</div>
        ${sec}Keep different variables separate.</div>
        ${sec}Example: 2x + 3y + 4x = 6x + 3y</div>
        ${sec}Only combine the like terms.</div>
      </div>

      <div class="home">
        ${tit}With Powers</div>
        ${sec}Terms must have the same powers to be like terms.</div>
        ${sec}Example: 2x² + 3x² = 5x²</div>
        ${sec}But 2x² + 3x cannot be combined.</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Combining unlike terms (e.g. x + x²).</div>
        ${sec}Forgetting to include the variable in the answer.</div>
        ${sec}Only adding numbers and ignoring variables.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise identifying and combining like terms to simplify expressions more easily!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-11') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Multiply Decimals</div>
        <div class="home-secondary">Multiplying decimals can be made easier by turning them into whole numbers first. We do this by scaling (multiplying by 10, 100, etc.).</div>
        ${sec}In this section, we will learn how to multiply decimals by decimals using place value.</div>
        ${sec}<div class="red">*Disclaimer: Make sure you adjust the final answer correctly after scaling!</div></div>
      </div>

      <div class="home">
        ${tit}Why Scale Numbers?</div>
        ${sec}Decimals can be tricky to multiply directly.</div>
        ${sec}We can make it easier by turning them into whole numbers.</div>
        ${sec}We do this by multiplying both numbers by 10, 100, or 1000.</div>
      </div>

      <div class="home">
        ${tit}Basic Method</div>
        ${sec}Step 1: Turn both decimals into whole numbers by scaling.</div>
        ${sec}Step 2: Multiply the whole numbers.</div>
        ${sec}Step 3: Adjust the answer by dividing.</div>
      </div>

      <div class="home">
        ${tit}Example 1</div>
        ${sec}0.2 × 0.3</div>
        ${sec}Step 1: Multiply both by 10 → 2 × 3</div>
        ${sec}Step 2: 2 × 3 = 6</div>
        ${sec}Step 3: Divide by 100 → 0.06</div>
      </div>

      <div class="home">
        ${tit}Example 2</div>
        ${sec}0.02 × 0.5</div>
        ${sec}Step 1: Multiply both to make whole numbers</div>
        ${sec}0.02 × 100 = 2</div>
        ${sec}0.5 × 10 = 5</div>
        ${sec}Step 2: 2 × 5 = 10</div>
        ${sec}Step 3: Divide by 1000 → 0.01</div>
      </div>

      <div class="home">
        ${tit}Why Divide?</div>
        ${sec}We scaled the numbers up, so we must scale the answer back down.</div>
        ${sec}Count how many total times you multiplied by 10.</div>
        ${sec}Example: ×100 and ×10 = ×1000, so divide by 1000.</div>
      </div>

      <div class="home">
        ${tit}Quick Method</div>
        ${sec}You can also count decimal places.</div>
        ${sec}Example: 0.2 × 0.3 → 1 decimal place each → 2 total</div>
        ${sec}2 × 3 = 6 → 0.06</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Forgetting to divide at the end.</div>
        ${sec}Not scaling both numbers correctly.</div>
        ${sec}Placing the decimal point in the wrong position.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise multiplying decimals using scaling to improve your accuracy!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-12') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Percentages Of</div>
        <div class="home-secondary">Finding percentages of amounts helps us solve real-life problems like discounts, money, and data. We can use simple building blocks to make it easier.</div>
        ${sec}In this section, we will learn how to find percentages by breaking them into easier parts.</div>
        ${sec}<div class="red">*Disclaimer: Always start with simple percentages like 10%, 1%, 50%, 25%, or 5%!</div></div>
      </div>

      <div class="home">
        ${tit}What Does "Of" Mean?</div>
        ${sec}The word "of" in maths means multiply.</div>
        ${sec}Example: 50% of 20 means 50% × 20.</div>
        ${sec}We are finding a part of a whole amount.</div>
      </div>

      <div class="home">
        ${tit}Start with 100%</div>
        ${sec}100% means the whole amount.</div>
        ${sec}Example: 100% of 50 = 50</div>
        ${sec}This is your starting point.</div>
      </div>

      <div class="home">
        ${tit}Find 10%</div>
        ${sec}To find 10%, divide by 10.</div>
        ${sec}Example: 10% of 50 = 5</div>
        ${sec}This is one of the most useful building blocks.</div>
      </div>

      <div class="home">
        ${tit}Find 1%</div>
        ${sec}To find 1%, divide by 100.</div>
        ${sec}Example: 1% of 50 = 0.5</div>
        ${sec}You can use this for tricky percentages like 17%.</div>
      </div>

      <div class="home">
        ${tit}Find 50%</div>
        ${sec}50% means half.</div>
        ${sec}To find it, divide by 2.</div>
        ${sec}Example: 50% of 50 = 25</div>
      </div>

      <div class="home">
        ${tit}Find 25%</div>
        ${sec}25% means a quarter.</div>
        ${sec}To find it, divide by 4.</div>
        ${sec}Example: 25% of 50 = 12.5</div>
      </div>

      <div class="home">
        ${tit}Find 5%</div>
        ${sec}5% is half of 10%.</div>
        ${sec}First find 10%, then divide by 2.</div>
        ${sec}Example: 10% of 50 = 5, so 5% = 2.5</div>
      </div>

      <div class="home">
        ${tit}Building Up Percentages</div>
        ${sec}We can combine building blocks to find any percentage.</div>
        ${sec}Example: Find 15% of 50</div>
        ${sec}10% = 5</div>
        ${sec}5% = 2.5</div>
        ${sec}Add them: 5 + 2.5 = 7.5</div>
      </div>

      <div class="home">
        ${tit}Another Example</div>
        ${sec}Find 35% of 80</div>
        ${sec}10% = 8</div>
        ${sec}30% = 24 (3 × 10%)</div>
        ${sec}5% = 4</div>
        ${sec}Add them: 24 + 4 = 28</div>
      </div>

      <div class="home">
        ${tit}Using 1% for Accuracy</div>
        ${sec}Example: Find 17% of 200</div>
        ${sec}10% = 20</div>
        ${sec}1% = 2</div>
        ${sec}7% = 14 (7 × 1%)</div>
        ${sec}Add them: 20 + 14 = 34</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Forgetting what 10% or 1% is.</div>
        ${sec}Not adding all parts together.</div>
        ${sec}Mixing up when to divide or multiply.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise finding percentages by breaking them into building blocks to make calculations easier!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-13') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Percentages: Make</div>
        <div class="home-secondary">Percentages are used to show parts of a whole out of 100. They are used in everyday life, such as discounts, test scores, and statistics.</div>
        ${sec}In this section, we will learn how to understand, use, and create percentages in different situations.</div>
        ${sec}<div class="red">*Disclaimer: A percentage always means “out of 100”, so think carefully about the whole amount!</div></div>
      </div>

      <div class="home">
        ${tit}What is a Percentage?</div>
        ${sec}A percentage is a way of expressing a number as a fraction of 100. The symbol % means “per hundred”.</div>
        ${sec}For example, 50% means 50 out of 100, and 25% means 25 out of 100.</div>
        ${sec}This means percentages are another way of writing fractions and decimals.</div>
        ${sec}For example: 50% = 1/2 = 0.5 and 25% = 1/4 = 0.25.</div>
      </div>

      <div class="home">
        ${tit}Where Do We Use Percentages?</div>
        ${sec}Percentages are used in many real-life situations.</div>
        ${sec}In shops, percentages are used for discounts, such as 20% off.</div>
        ${sec}In school, test scores are often given as percentages, like 75%.</div>
        ${sec}In data, percentages help compare amounts easily because everything is out of 100.</div>
        ${sec}This makes them useful for understanding and comparing values quickly.</div>
      </div>

      <div class="home">
        ${tit}Making Percentages from Fractions</div>
        ${sec}To make a percentage from a fraction, we need to turn the fraction into something out of 100.</div>
        ${sec}For example, 1/2 can be turned into 50/100, which is 50%.</div>
        ${sec}If the denominator is not 100, we can either scale it or convert it into a decimal first.</div>
        ${sec}Example: 3/4 = 0.75, so it is 75%.</div>
      </div>

      <div class="home">
        ${tit}Making Percentages from Decimals</div>
        ${sec}To convert a decimal into a percentage, multiply it by 100.</div>
        ${sec}This moves the decimal point two places to the right.</div>
        ${sec}For example, 0.6 becomes 60%, and 0.23 becomes 23%.</div>
        ${sec}This works because percentages are always out of 100.</div>
      </div>

      <div class="home">
        ${tit}Understanding 100%</div>
        ${sec}100% represents the whole amount.</div>
        ${sec}If something is 100%, nothing has been added or taken away.</div>
        ${sec}For example, if a class has 30 students, then 100% of the class is 30 students.</div>
        ${sec}All other percentages are parts of this whole.</div>
      </div>

      <div class="home">
        ${tit}Percentages Greater than 100%</div>
        ${sec}Percentages can be more than 100%.</div>
        ${sec}This means the value is greater than the original whole.</div>
        ${sec}For example, 150% means 1.5 times the original amount.</div>
        ${sec}This is often used in growth, such as increasing prices or populations.</div>
      </div>

      <div class="home">
        ${tit}Writing Your Own Percentages</div>
        ${sec}Sometimes you are given information and need to create a percentage.</div>
        ${sec}Example: 20 out of 50 students passed a test.</div>
        ${sec}First write it as a fraction: 20/50.</div>
        ${sec}Then convert it: 20 ÷ 50 = 0.4 → 40%.</div>
        ${sec}This means 40% of the students passed.</div>
      </div>

      <div class="home">
        ${tit}Percentages and Comparison</div>
        ${sec}Percentages make it easier to compare different amounts.</div>
        ${sec}For example, 10 out of 20 is 50%, and 25 out of 50 is also 50%.</div>
        ${sec}Even though the numbers are different, the percentages are the same.</div>
        ${sec}This shows that percentages help us compare fairly.</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Forgetting that percentages are always out of 100.</div>
        ${sec}Not multiplying decimals by 100 when converting.</div>
        ${sec}Mixing up fractions, decimals, and percentages.</div>
        ${sec}Not thinking about what the whole amount represents.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise making and interpreting percentages in different situations to build confidence and understanding!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-14') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Powers & Roots</div>
        <div class="home-secondary">Powers and roots help us work with repeated multiplication and find numbers that multiply to make other numbers.</div>
        ${sec}In this section, we will learn how to use powers (indices) and roots, and how they are connected.</div>
        ${sec}<div class="red">*Disclaimer: Always read powers carefully and remember that roots undo powers!</div></div>
      </div>

      <div class="home">
        ${tit}What are Powers?</div>
        ${sec}A power (also called an index) shows repeated multiplication.</div>
        ${sec}For example, 3² means 3 × 3.</div>
        ${sec}The small number (²) tells you how many times to multiply the base number.</div>
        ${sec}So 3² = 9, and 4³ = 4 × 4 × 4 = 64.</div>
      </div>

      <div class="home">
        ${tit}Parts of a Power</div>
        ${sec}A power has two parts: the base and the exponent.</div>
        ${sec}In 5³, the base is 5 and the exponent is 3.</div>
        ${sec}The exponent tells us how many times to multiply the base by itself.</div>
        ${sec}Understanding this helps avoid mistakes when calculating.</div>
      </div>

      <div class="home">
        ${tit}Square Numbers</div>
        ${sec}A square number is a number multiplied by itself.</div>
        ${sec}Examples: 1² = 1, 2² = 4, 3² = 9, 4² = 16.</div>
        ${sec}These are called square numbers because they can form perfect squares.</div>
        ${sec}You should try to remember common square numbers up to at least 12².</div>
      </div>

      <div class="home">
        ${tit}Cube Numbers</div>
        ${sec}A cube number is a number multiplied by itself twice.</div>
        ${sec}Examples: 2³ = 8, 3³ = 27, 4³ = 64.</div>
        ${sec}These are called cube numbers because they represent volumes of cubes.</div>
        ${sec}Cube numbers grow faster than square numbers.</div>
      </div>

      <div class="home">
        ${tit}What are Roots?</div>
        ${sec}Roots are the opposite of powers.</div>
        ${sec}They tell us what number was multiplied to get the result.</div>
        ${sec}For example, √9 = 3 because 3 × 3 = 9.</div>
        ${sec}Roots “undo” powers.</div>
      </div>

      <div class="home">
        ${tit}Square Roots</div>
        ${sec}A square root finds a number that has been multiplied by itself.</div>
        ${sec}Example: √16 = 4 because 4 × 4 = 16.</div>
        ${sec}Only positive roots are usually used at this level.</div>
        ${sec}It is important to recognise common square roots quickly.</div>
      </div>

      <div class="home">
        ${tit}Cube Roots</div>
        ${sec}A cube root finds a number that has been multiplied three times.</div>
        ${sec}Example: ∛27 = 3 because 3 × 3 × 3 = 27.</div>
        ${sec}Cube roots undo cube numbers.</div>
        ${sec}They are less common but still important to understand.</div>
      </div>

      <div class="home">
        ${tit}Powers and Roots Together</div>
        ${sec}Powers and roots are inverse operations.</div>
        ${sec}This means one undoes the other.</div>
        ${sec}Example: √(5²) = 5</div>
        ${sec}Example: (√9)² = 9</div>
        ${sec}Understanding this helps when solving equations.</div>
      </div>

      <div class="home">
        ${tit}Estimating Roots</div>
        ${sec}Not all square roots are whole numbers.</div>
        ${sec}Example: √10 is between √9 and √16.</div>
        ${sec}So it is between 3 and 4.</div>
        ${sec}Estimating helps when exact answers are not needed.</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Confusing powers and multiplication (e.g. 3² is not 3 × 2).</div>
        ${sec}Forgetting that √ means square root, not divide by 2.</div>
        ${sec}Mixing up square numbers and cube numbers.</div>
        ${sec}Not recognising common values like √25 or 4³.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise using powers and roots to build confidence with indices and inverse operations!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-15') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Prime Numbers, Factors, LCM & HCF</div>
        <div class="home-secondary">Prime numbers, factors, Lowest Common Multiples (LCM), and Highest Common Factors (HCF) help us understand how numbers work and connect together.</div>
        ${sec}In this section, we will learn how to identify primes, find factors, and calculate LCM and HCF in different situations.</div>
        ${sec}<div class="red">*Disclaimer: Always check your factors carefully—missing one can lead to the wrong answer!</div></div>
      </div>

      <div class="home">
        ${tit}What is a Prime Number?</div>
        ${sec}A prime number is a number that has exactly two factors: 1 and itself.</div>
        ${sec}For example, 5 is a prime number because its only factors are 1 and 5.</div>
        ${sec}Other examples include 2, 3, 7, and 11.</div>
        ${sec}2 is the only even prime number.</div>
      </div>

      <div class="home">
        ${tit}What is a Factor?</div>
        ${sec}A factor is a number that divides exactly into another number.</div>
        ${sec}For example, the factors of 12 are 1, 2, 3, 4, 6, and 12.</div>
        ${sec}This means 12 can be divided evenly by all of these numbers.</div>
        ${sec}Factors always come in pairs.</div>
      </div>

      <div class="home">
        ${tit}Prime vs Composite Numbers</div>
        ${sec}A prime number has exactly two factors.</div>
        ${sec}A composite number has more than two factors.</div>
        ${sec}For example, 7 is prime, but 12 is composite.</div>
        ${sec}The number 1 is not prime because it only has one factor.</div>
      </div>

      <div class="home">
        ${tit}Finding Factors</div>
        ${sec}To find factors, divide the number by whole numbers and see what works exactly.</div>
        ${sec}Example: To find factors of 18, test numbers like 1, 2, 3, 6, and 9.</div>
        ${sec}So the factors of 18 are 1, 2, 3, 6, 9, and 18.</div>
        ${sec}Listing them in pairs can help you stay organised.</div>
      </div>

      <div class="home">
        ${tit}What is the HCF?</div>
        ${sec}The Highest Common Factor (HCF) is the largest factor that two or more numbers share.</div>
        ${sec}Example: Factors of 12 = 1, 2, 3, 4, 6, 12.</div>
        ${sec}Factors of 18 = 1, 2, 3, 6, 9, 18.</div>
        ${sec}Common factors are 1, 2, 3, and 6, so the HCF is 6.</div>
      </div>

      <div class="home">
        ${tit}What is the LCM?</div>
        ${sec}The Lowest Common Multiple (LCM) is the smallest number that is a multiple of two or more numbers.</div>
        ${sec}Multiples of 4: 4, 8, 12, 16, 20...</div>
        ${sec}Multiples of 6: 6, 12, 18, 24...</div>
        ${sec}The first common multiple is 12, so the LCM is 12.</div>
      </div>

      <div class="home">
        ${tit}Using Prime Factorisation</div>
        ${sec}Prime factorisation means breaking a number into prime numbers.</div>
        ${sec}Example: 12 = 2 × 2 × 3.</div>
        ${sec}This can help us find both HCF and LCM more easily.</div>
        ${sec}It is often shown using factor trees.</div>
      </div>

      <div class="home">
        ${tit}HCF Using Prime Factors</div>
        ${sec}Write both numbers as prime factors.</div>
        ${sec}Example: 12 = 2 × 2 × 3 and 18 = 2 × 3 × 3.</div>
        ${sec}Find the common primes: 2 and 3.</div>
        ${sec}Multiply them: 2 × 3 = 6, so the HCF is 6.</div>
      </div>

      <div class="home">
        ${tit}LCM Using Prime Factors</div>
        ${sec}Write both numbers as prime factors.</div>
        ${sec}Take all prime factors, using the highest power of each.</div>
        ${sec}Example: 12 = 2² × 3 and 18 = 2 × 3².</div>
        ${sec}LCM = 2² × 3² = 4 × 9 = 36.</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Forgetting that prime numbers only have two factors.</div>
        ${sec}Missing factors when listing them.</div>
        ${sec}Mixing up multiples and factors.</div>
        ${sec}Confusing LCM (multiples) with HCF (factors).</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise finding prime numbers, factors, HCF, and LCM to build confidence and understanding!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-16') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Ratio</div>
        <div class="home-secondary">Ratios are used to compare amounts and show the relationship between different quantities.</div>
        ${sec}In this section, we will learn how to understand, simplify, and use ratios in different situations.</div>
        ${sec}<div class="red">*Disclaimer: A ratio compares parts, so always check what each part represents!</div></div>
      </div>

      <div class="home">
        ${tit}What is a Ratio?</div>
        ${sec}A ratio shows how two or more amounts are compared.</div>
        ${sec}It tells us how much of one thing there is compared to another.</div>
        ${sec}Ratios are written using a colon, for example 2:3.</div>
        ${sec}This means for every 2 of one thing, there are 3 of another.</div>
      </div>

      <div class="home">
        ${tit}Writing Ratios</div>
        ${sec}Ratios can be written in three ways: using a colon (2:3), using the word "to" (2 to 3), or as a fraction (2/3).</div>
        ${sec}All three forms mean the same thing.</div>
        ${sec}It is important to keep the order the same.</div>
        ${sec}For example, boys:girls is not the same as girls:boys.</div>
      </div>

      <div class="home">
        ${tit}Simplifying Ratios</div>
        ${sec}Ratios can be simplified in the same way as fractions.</div>
        ${sec}Divide both parts by the same number.</div>
        ${sec}Example: 4:8 can be simplified by dividing both parts by 4.</div>
        ${sec}So 4:8 = 1:2.</div>
      </div>

      <div class="home">
        ${tit}Equivalent Ratios</div>
        ${sec}Equivalent ratios show the same relationship between numbers.</div>
        ${sec}We can multiply or divide both parts by the same number.</div>
        ${sec}Example: 1:2 is equivalent to 2:4 and 3:6.</div>
        ${sec}These all represent the same ratio.</div>
      </div>

      <div class="home">
        ${tit}Sharing in a Ratio</div>
        ${sec}Ratios are often used to share amounts.</div>
        ${sec}Example: Divide 20 in the ratio 1:3.</div>
        ${sec}First add the parts: 1 + 3 = 4.</div>
        ${sec}Then divide 20 by 4 to get 5.</div>
        ${sec}So the shares are 5 and 15.</div>
      </div>

      <div class="home">
        ${tit}Finding the Total from a Ratio</div>
        ${sec}Sometimes you are given one part of a ratio and need to find the total.</div>
        ${sec}Example: If 2 parts = 10, then 1 part = 5.</div>
        ${sec}You can then find all other parts using this value.</div>
        ${sec}This helps solve many ratio problems.</div>
      </div>

      <div class="home">
        ${tit}Ratios and Fractions</div>
        ${sec}Ratios can be written as fractions.</div>
        ${sec}Example: The ratio 2:3 can be written as 2/3.</div>
        ${sec}This means 2 out of 3 parts.</div>
        ${sec}This helps connect ratios to fractions and percentages.</div>
      </div>

      <div class="home">
        ${tit}Ratios in Real Life</div>
        ${sec}Ratios are used in many real-life situations.</div>
        ${sec}In recipes, ingredients are often in ratios.</div>
        ${sec}In maps, scale is shown using ratios.</div>
        ${sec}In sharing money or items, ratios help divide fairly.</div>
      </div>

      <div class="home">
        ${tit}Comparing Ratios</div>
        ${sec}To compare ratios, we can simplify them or make them equivalent.</div>
        ${sec}Example: 2:4 simplifies to 1:2.</div>
        ${sec}If two ratios simplify to the same form, they are equal.</div>
        ${sec}This helps us check if ratios are the same.</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Mixing up the order of the ratio.</div>
        ${sec}Not simplifying ratios fully.</div>
        ${sec}Forgetting to divide all parts when sharing.</div>
        ${sec}Confusing ratios with fractions without understanding the context.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise simplifying, sharing, and using ratios in real-life situations to build confidence and understanding!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-17') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Recurring Decimals into Fractions</div>
        <div class="home-secondary">Recurring decimals are decimals that repeat forever. We can convert them into exact fractions.</div>
        ${sec}In this section, we will learn how to recognise recurring decimals and convert them into fractions step by step.</div>
        ${sec}<div class="red">*Disclaimer: Make sure you correctly identify the repeating part of the decimal!</div></div>
      </div>

      <div class="home">
        ${tit}What is a Recurring Decimal?</div>
        ${sec}A recurring decimal is a decimal where one or more digits repeat forever.</div>
        ${sec}We often show this using dots above the repeating digits or by writing "...".</div>
        ${sec}For example, 0.333... means the 3 repeats forever.</div>
        ${sec}Another example is 0.121212..., where 12 keeps repeating.</div>
      </div>

      <div class="home">
        ${tit}Why Convert to Fractions?</div>
        ${sec}Recurring decimals can be written exactly as fractions.</div>
        ${sec}Fractions give an exact value instead of an endless decimal.</div>
        ${sec}This is useful in algebra and problem solving.</div>
        ${sec}It also helps us understand numbers more clearly.</div>
      </div>

      <div class="home">
        ${tit}Simple Recurring Decimals (One Digit)</div>
        ${sec}Let x = 0.333...</div>
        ${sec}Multiply both sides by 10: 10x = 3.333...</div>
        ${sec}Subtract the original: 10x − x = 3.333... − 0.333...</div>
        ${sec}This gives 9x = 3, so x = 1/3.</div>
      </div>

      <div class="home">
        ${tit}Another Example</div>
        ${sec}Let x = 0.666...</div>
        ${sec}Multiply by 10: 10x = 6.666...</div>
        ${sec}Subtract: 9x = 6.</div>
        ${sec}So x = 6/9, which simplifies to 2/3.</div>
      </div>

      <div class="home">
        ${tit}Two-Digit Recurring Decimals</div>
        ${sec}Let x = 0.121212...</div>
        ${sec}Multiply by 100 (because two digits repeat): 100x = 12.121212...</div>
        ${sec}Subtract: 100x − x = 12.121212... − 0.121212...</div>
        ${sec}This gives 99x = 12.</div>
        ${sec}So x = 12/99, which simplifies to 4/33.</div>
      </div>

      <div class="home">
        ${tit}Mixed Recurring Decimals</div>
        ${sec}Sometimes only part of the decimal repeats.</div>
        ${sec}Example: x = 0.1666...</div>
        ${sec}Multiply to move past the non-recurring part: 10x = 1.666...</div>
        ${sec}Then multiply again: 100x = 16.666...</div>
        ${sec}Subtract: 100x − 10x = 16.666... − 1.666...</div>
        ${sec}This gives 90x = 15, so x = 15/90 = 1/6.</div>
      </div>

      <div class="home">
        ${tit}Step-by-Step Method</div>
        ${sec}1. Let x equal the recurring decimal.</div>
        ${sec}2. Multiply to line up the repeating digits.</div>
        ${sec}3. Subtract to remove the recurring part.</div>
        ${sec}4. Solve the equation.</div>
        ${sec}5. Simplify the fraction.</div>
      </div>

      <div class="home">
        ${tit}Understanding the Multiplication</div>
        ${sec}We multiply by 10, 100, or 1000 depending on how many digits repeat.</div>
        ${sec}One repeating digit → multiply by 10.</div>
        ${sec}Two repeating digits → multiply by 100.</div>
        ${sec}This lines up the decimals so they cancel when subtracting.</div>
      </div>

      <div class="home">
        ${tit}Checking Your Answer</div>
        ${sec}After finding the fraction, divide it to check.</div>
        ${sec}Example: 1/3 = 0.333..., which matches the original decimal.</div>
        ${sec}This confirms your answer is correct.</div>
        ${sec}Always simplify fully.</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Using the wrong power of 10.</div>
        ${sec}Forgetting to subtract correctly.</div>
        ${sec}Not identifying the repeating part.</div>
        ${sec}Forgetting to simplify the final fraction.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise converting recurring decimals into fractions to build confidence and understanding!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-18') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Simplifying</div>
        <div class="home-secondary">Simplifying means writing something in its simplest form while keeping the same value.</div>
        ${sec}In this section, we will learn how to simplify fractions, ratios, and expressions step by step.</div>
        ${sec}<div class="red">*Disclaimer: Always divide or reduce correctly—simplifying changes the form, not the value!</div></div>
      </div>

      <div class="home">
        ${tit}What Does Simplifying Mean?</div>
        ${sec}Simplifying means making something easier to understand or work with.</div>
        ${sec}The value stays exactly the same, but the numbers become smaller or clearer.</div>
        ${sec}For example, 2/4 and 1/2 have the same value, but 1/2 is simpler.</div>
        ${sec}We always aim to write answers in their simplest form.</div>
      </div>

      <div class="home">
        ${tit}Simplifying Fractions</div>
        ${sec}To simplify a fraction, divide the top and bottom by the same number.</div>
        ${sec}This number must be a common factor of both.</div>
        ${sec}Example: 6/8 ÷ 2 = 3/4.</div>
        ${sec}So 6/8 simplifies to 3/4.</div>
      </div>

      <div class="home">
        ${tit}Using the Highest Common Factor (HCF)</div>
        ${sec}The quickest way to simplify is by using the Highest Common Factor.</div>
        ${sec}Example: Simplify 12/18.</div>
        ${sec}The HCF of 12 and 18 is 6.</div>
        ${sec}Divide both by 6 → 12/18 = 2/3.</div>
      </div>

      <div class="home">
        ${tit}Simplifying Step by Step</div>
        ${sec}Sometimes you may simplify in more than one step.</div>
        ${sec}Example: 8/12 → divide by 2 = 4/6 → divide by 2 = 2/3.</div>
        ${sec}Or go straight by dividing by 4.</div>
        ${sec}Both methods give the same final answer.</div>
      </div>

      <div class="home">
        ${tit}Simplifying Ratios</div>
        ${sec}Ratios can be simplified in the same way as fractions.</div>
        ${sec}Divide both parts by the same number.</div>
        ${sec}Example: 10:15 ÷ 5 = 2:3.</div>
        ${sec}Always keep the ratio in whole numbers if possible.</div>
      </div>

      <div class="home">
        ${tit}Simplifying Expressions</div>
        ${sec}Simplifying expressions means collecting like terms.</div>
        ${sec}Example: 2x + 3x = 5x.</div>
        ${sec}You can only combine terms with the same variable.</div>
        ${sec}Example: 2x + 3y cannot be simplified further.</div>
      </div>

      <div class="home">
        ${tit}Cancelling in Fractions</div>
        ${sec}Cancelling means dividing common factors before multiplying.</div>
        ${sec}Example: 6/9 can cancel by dividing both by 3.</div>
        ${sec}This gives 2/3.</div>
        ${sec}This makes calculations quicker and easier.</div>
      </div>

      <div class="home">
        ${tit}Checking if Fully Simplified</div>
        ${sec}A fraction is fully simplified when the only common factor is 1.</div>
        ${sec}Example: 3/4 cannot be simplified further.</div>
        ${sec}Always check for any remaining common factors.</div>
        ${sec}If there are none, you are finished.</div>
      </div>

      <div class="home">
        ${tit}Why Simplifying is Important</div>
        ${sec}Simplifying makes answers easier to understand.</div>
        ${sec}It is often required in exams.</div>
        ${sec}It helps avoid mistakes in later calculations.</div>
        ${sec}It shows clear mathematical understanding.</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Not dividing both parts by the same number.</div>
        ${sec}Stopping too early and not fully simplifying.</div>
        ${sec}Cancelling incorrectly across addition.</div>
        ${sec}Mixing up simplifying with changing the value.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise simplifying fractions, ratios, and expressions to build confidence and accuracy!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'library-19') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        <div class="home-title">Coordinates</div>
        <div class="home-secondary">Coordinates are used to describe positions on a grid. They help us locate points and understand movement.</div>
        ${sec}In this section, we will learn how to read, write, and plot coordinates on a coordinate grid.</div>
        ${sec}<div class="red">*Disclaimer: Always read coordinates in the correct order—across first, then up!</div></div>
      </div>

      <div class="home">
        ${tit}What are Coordinates?</div>
        ${sec}Coordinates are numbers that show the position of a point on a grid.</div>
        ${sec}They are written as a pair of numbers inside brackets, for example (3, 2).</div>
        ${sec}The first number tells you how far to move across.</div>
        ${sec}The second number tells you how far to move up or down.</div>
      </div>

      <div class="home">
        ${tit}The Coordinate Grid</div>
        ${sec}A coordinate grid is made of two number lines that cross.</div>
        ${sec}The horizontal line is called the x-axis.</div>
        ${sec}The vertical line is called the y-axis.</div>
        ${sec}These lines meet at the origin.</div>
      </div>

      <div class="home">
        ${tit}The Origin</div>
        ${sec}The origin is the point where the x-axis and y-axis meet.</div>
        ${sec}Its coordinate is (0, 0).</div>
        ${sec}It is the starting point for all coordinates.</div>
        ${sec}Every other point is measured from here.</div>
      </div>

      <div class="home">
        ${tit}Reading Coordinates</div>
        ${sec}Always read coordinates in the order (x, y).</div>
        ${sec}First move across along the x-axis.</div>
        ${sec}Then move up or down along the y-axis.</div>
        ${sec}Example: (4, 3) means 4 across and 3 up.</div>
      </div>

      <div class="home">
        ${tit}Plotting Coordinates</div>
        ${sec}To plot a coordinate, start at the origin.</div>
        ${sec}Move across to the x-value.</div>
        ${sec}Then move up or down to the y-value.</div>
        ${sec}Mark the point clearly on the grid.</div>
      </div>

      <div class="home">
        ${tit}Negative Coordinates</div>
        ${sec}Coordinates can be negative.</div>
        ${sec}Negative x-values move left.</div>
        ${sec}Negative y-values move down.</div>
        ${sec}Example: (-2, 3) means 2 left and 3 up.</div>
      </div>

      <div class="home">
        ${tit}Quadrants</div>
        ${sec}The grid is divided into four sections called quadrants.</div>
        ${sec}Quadrant 1: both x and y are positive.</div>
        ${sec}Quadrant 2: x is negative, y is positive.</div>
        ${sec}Quadrant 3: both x and y are negative.</div>
        ${sec}Quadrant 4: x is positive, y is negative.</div>
      </div>

      <div class="home">
        ${tit}Describing Movement</div>
        ${sec}Coordinates can show movement between points.</div>
        ${sec}Moving right increases the x-value.</div>
        ${sec}Moving up increases the y-value.</div>
        ${sec}Example: From (2, 3) to (5, 3) is 3 steps right.</div>
      </div>

      <div class="home">
        ${tit}Drawing Shapes</div>
        ${sec}We can plot several coordinates and join them to make shapes.</div>
        ${sec}This helps in geometry and graphs.</div>
        ${sec}Always plot points accurately before joining them.</div>
        ${sec}Label points clearly.</div>
      </div>

      <div class="home">
        ${tit}Real-Life Uses</div>
        ${sec}Coordinates are used in maps and navigation.</div>
        ${sec}They are used in computer graphics and games.</div>
        ${sec}They help describe positions in maths and science.</div>
        ${sec}They are important for understanding graphs.</div>
      </div>

      <div class="home">
        ${tit}Common Mistakes</div>
        ${sec}Mixing up the order (y, x instead of x, y).</div>
        ${sec}Forgetting to start at the origin.</div>
        ${sec}Plotting negative numbers in the wrong direction.</div>
        ${sec}Misreading the scale of the grid.</div>
      </div>

      <div class="home">
        ${sec}After this, you should practise reading and plotting coordinates to build confidence and accuracy!</div>
      </div>
  `;
} else if (urlParams.get('page') === 'tutoring') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Real-Life Tutoring</div>
        ${sec}Tokens aren't just for games — you can trade them in for a real 15-minute 1-to-1 tutoring session with Denys.</div>
        ${sec}There are two tiers, matching the two hardest topic colours in the library and games.</div>
      </div>

      <div class="home"><div class="home-advanced">
        ${sec}<div class="bold">Yellow Topics Tutoring — 1000 <img src="icons/token.png" class="token-count-img"></div></div>
        ${sec}Covers the Yellow-tier topics: Fibonacci sequence, nth term, circle facts, advanced angle facts and calculations, probability, transformations, Pythagoras' theorem (2D and 3D), quadratic equations, logics, sin/cos/tan, and circle calculations.</div>
      </div>

      <div class="home-denys">
        ${sec}<div class="bold">Red Topics Tutoring — 2000 <img src="icons/token.png" class="token-count-img"></div></div>
        ${sec}Covers the Red-tier topics: advanced circle calculations, advanced logics, number bases, tetrations and pentations, and inequalities.</div>
      </div></div>

      <div class="home">
        ${sec}Ready to book? Head to the <a href="index.html?page=tokenshop">Token Shop</a> to spend your tokens on a session.</div>
      </div>
  `;
} else if (urlParams.get('page') === 'game') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Game Page</div>
        ${sec}Select the game difficulty you would like to play.</div>
        ${sec}Each of them have different difficulties and tokens for a correct question.</div>
        ${sec}Try them out! Try them all out to see what your level is like!</div>
      </div>
      <div class="home" style="display: flex; justify-content: space-between; align-items: top; flex-direction: row;">
        <div class="flex-dificulty">
          <a href="index.html?page=game-normal-start"><img src="icons/difficulties/normal.jpg" class="dif-img"></a>
          <div class="big-dif"><a href="index.html?page=game-normal-start">Normal</a></div>
          <div>10 <img src="icons/token.png" class="token-count-img"> per Correct Answer</div>
          ${sec}Contains all Green-tier topics.</div>
        </div>
        <div class="flex-dificulty">
          <a href="index.html?page=game-hard-start"><img src="icons/difficulties/hard.jpg" class="dif-img"></a>
          <div class="big-dif"><a href="index.html?page=game-hard-start">Hard</a></div>
          <div>25 <img src="icons/token.png" class="token-count-img"> per Correct Answer</div>
          ${sec}Contains all Green-tier topics.</div>
        </div>
        <div class="flex-dificulty">
          <a href="index.html?page=game-master-start"><img src="icons/difficulties/master.jpg" class="dif-img"></a>
          <div class="big-dif"><a href="index.html?page=game-master-start">Master</a></div>
          <div>50 <img src="icons/token.png" class="token-count-img"> per Correct Answer</div>
          ${sec}Contains some Green-tier and some Yellow-tier topics.</div>
        </div>
        <div class="flex-dificulty">
          <a href="index.html?page=game-easy-denys-start"><img src="icons/difficulties/easy-denys.jpg" class="dif-img"></a>
          <div class="big-dif"><a href="index.html?page=game-easy-denys-start">Easy Denys</a></div>
          <div>100 <img src="icons/token.png" class="token-count-img"> per Correct Answer</div>
          ${sec}Contains all Yellow-tier and some Red-tier topics.</div>
        </div>
        <div class="flex-dificulty">
          <a href="index.html?page=game-ultimate-denys-start"><img src="icons/difficulties/ultimate-denys.jpg" class="dif-img"></a>
          <div class="big-dif"><a href="index.html?page=game-ultimate-denys-start">Ultimate Denys</a></div>
          <div>150 <img src="icons/token.png" class="token-count-img"> per Correct Answer</div>
          ${sec}Contains some Yellow-tier and all Red-tier topics.</div>
        </div>
      </div>
  `;
} else if (urlParams.get('page') === 'game-normal-start') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Game Page: Normal</div>
        ${sec}Whenever you're ready, press the button below to have 60 seconds to get as many correct questions as you can.</div>
        ${sec}Remember: Correct Answer = 10 <img src="icons/token.png" class="token-count-img">.</div>
        ${sec}<div class="red">Warning: If you switch tabs or windows during the game, you will be caught the moment you come back — you'll lose 100 tokens and be redirected straight back home!</div></div>
        <button class="start-game"><a href="index.html?page=game-normal-play">Start</a></button>
      </div>
  `;
} else if (urlParams.get('page') === 'game-hard-start') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Game Page: Hard</div>
        ${sec}Whenever you're ready, press the button below to have 60 seconds to get as many correct questions as you can.</div>
        ${sec}Remember: Correct Answer = 25 <img src="icons/token.png" class="token-count-img">.</div>
        ${sec}<div class="red">Warning: If you switch tabs or windows during the game, you will be caught the moment you come back — you'll lose 100 tokens and be redirected straight back home!</div></div>
        <button class="start-game"><a href="index.html?page=game-hard-play">Start</a></button>
      </div>
  `;
} else if (urlParams.get('page') === 'game-master-start') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Game Page: Master</div>
        ${sec}Whenever you're ready, press the button below to have 60 seconds to get as many correct questions as you can.</div>
        ${sec}Remember: Correct Answer = 50 <img src="icons/token.png" class="token-count-img">.</div>
        ${sec}<div class="red">Warning: If you switch tabs or windows during the game, you will be caught the moment you come back — you'll lose 100 tokens and be redirected straight back home!</div></div>
        <button class="start-game"><a href="index.html?page=game-master-play">Start</a></button>
      </div>
  `;
} else if (urlParams.get('page') === 'game-easy-denys-start') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Game Page: Easy Denys</div>
        ${sec}Whenever you're ready, press the button below to have 60 seconds to get as many correct questions as you can.</div>
        ${sec}Remember: Correct Answer = 100 <img src="icons/token.png" class="token-count-img">.</div>
        ${sec}<div class="red">Warning: If you switch tabs or windows during the game, you will be caught the moment you come back — you'll lose 100 tokens and be redirected straight back home!</div></div>
        <button class="start-game"><a href="index.html?page=game-easy-denys-play">Start</a></button>
      </div>
  `;
} else if (urlParams.get('page') === 'game-ultimate-denys-start') {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Game Page: Ultimate Denys</div>
        ${sec}Whenever you're ready, press the button below to have 60 seconds to get as many correct questions as you can.</div>
        ${sec}Remember: Correct Answer = 150 <img src="icons/token.png" class="token-count-img">.</div>
        ${sec}<div class="red">Warning: If you switch tabs or windows during the game, you will be caught the moment you come back — you'll lose 100 tokens and be redirected straight back home!</div></div>
        <button class="start-game"><a href="index.html?page=game-ultimate-denys-play">Start</a></button>
      </div>
  `;
} else if (urlParams.get('page') === 'tokenshop') {
  renderShop();
} else if (urlParams.get('page') === 'equip-palette') {
  renderEquipPalettePage();
} else if (
  (urlParams.get('page') === 'game-normal-play') ||
  (urlParams.get('page') === 'game-hard-play') ||
  (urlParams.get('page') === 'game-master-play') ||
  (urlParams.get('page') === 'game-easy-denys-play') ||
  (urlParams.get('page') === 'game-ultimate-denys-play')
) {
  runGame();
} else if (
  (urlParams.get('page') !== 'game-normal-play') &&
  (urlParams.get('page') !== 'game-hard-play') &&
  (urlParams.get('page') !== 'game-master-play') &&
  (urlParams.get('page') !== 'game-easy-denys-play') &&
  (urlParams.get('page') !== 'game-ultimate-denys-play') &&
  (urlParams.get('page') !== 'tokenshop') &&
  (urlParams.get('page') !== 'equip-palette')
) {
  document.querySelector('main').innerHTML = `
      <div class="home">
        ${tit}Error 404: Page not found, try again</div>
        ${sec}Link back home: <a href="index.html?page=home">CLICK!</a></div>
      </div>
  `;
}
}

function showAuthError(message) {
  const el = document.querySelector('#auth-error');
  if (el) el.textContent = message;
}

function wireAuthForms() {
  const loginBtn = document.querySelector('#do-login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const username = document.querySelector('#login-username').value;
      const password = document.querySelector('#login-password').value;
      try {
        await logIn(username, password);
        window.location.href = 'index.html?page=home';
      } catch (err) {
        showAuthError(err.message);
      }
    });
  }
}

// Renders a LogIn link (logged out) or just a Logout button (logged in) —
// no account name shown here — into the .auth-status slot on the right of the nav.
function renderAuthStatus() {
  const el = document.querySelector('.auth-status');
  if (!el) return;
  if (accountName === null) {
    el.innerHTML = `<a href="index.html?page=login">LOG IN</a>`;
  } else {
    el.innerHTML = `<a href="#" id="do-logout-btn">LOG OUT</a>`;
    document.querySelector('#do-logout-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      await logOut();
      window.location.href = 'index.html?page=login';
    });
  }
}

// Called by the game engine every time a question is answered correctly.
// Written straight to localStorage, which auth.js's Storage.prototype patch
// picks up and syncs to Firebase automatically — no manual save step.
function awardTokens(amount) {
  tokens += amount;
  localStorage.setItem('tokens', String(tokens));
  setTokens();
}

// Called by the game engine when a tab/window switch is caught during a game.
// Returns the amount actually deducted (useful for the "you lost X tokens" message).
function penalizeTabSwitch() {
  const before = tokens;
  tokens = Math.max(0, tokens - 100);
  localStorage.setItem('tokens', String(tokens));
  setTokens();
  return before - tokens;
}

// Read-only access to the live token balance for pages (like the token shop)
// that need to render based on the current amount without owning the variable.
function getTokens() {
  return tokens;
}

// Read-only access to the logged-in player's name (e.g. for the tutoring booking email).
function getAccountName() {
  return accountName;
}

// Called by the token shop when the player buys something.
// Returns true and deducts the cost if they can afford it, otherwise false (no change made).
function spendTokens(amount) {
  if (tokens < amount) return false;
  tokens -= amount;
  localStorage.setItem('tokens', String(tokens));
  setTokens();
  return true;
}

// Drives the whole app: fires immediately with the current auth state, and
// again on every login/logout. By the time it fires, Firebase data (if any)
// has already been pulled into localStorage, so tokens/theme reflect the
// signed-in account before anything renders.
watchAuthState((user) => {
  accountName = user ? (user.displayName || user.email).split(' ')[0] : null;
  tokens = Number(localStorage.getItem('tokens')) || 0;
  setTokens();

  document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
  const activeTheme = localStorage.getItem('activeTheme');
  if (activeTheme) {
    document.body.classList.add(`theme-${activeTheme}`);
  }

  renderAuthStatus();
  renderPage();
  wireAuthForms();
});

export { awardTokens, penalizeTabSwitch, getTokens, getAccountName, spendTokens };
