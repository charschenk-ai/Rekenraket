const missions = [
  { name: "Plusmissie", sign: "+", min: 2, max: 24, make: (a, b) => a + b },
  { name: "Minmissie", sign: "-", min: 2, max: 24, make: (a, b) => a - b },
  { name: "Keerclub", sign: "x", min: 1, max: 10, make: (a, b) => a * b },
];

const BASE_COINS = 10;
const COMBO_STEP = 3;
const STAR_GOAL = 5;
const STAR_BONUS = 25;

const rewards = [
  { id: "star", label: "Gouden ster", icon: "★", cost: 40 },
  { id: "trail", label: "Regenboogspoor", icon: "≋", cost: 75 },
  { id: "crown", label: "Raketkroon", icon: "♛", cost: 120 },
];

const state = {
  coins: Number(localStorage.getItem("rekenraket-coins") || 0),
  stars: Number(localStorage.getItem("rekenraket-stars") || 0),
  level: Number(localStorage.getItem("rekenraket-level") || 1),
  mode: localStorage.getItem("rekenraket-mode") || "mixed",
  table: Number(localStorage.getItem("rekenraket-table") || 1),
  combo: 1,
  correctThisStar: Number(localStorage.getItem("rekenraket-progress") || 0),
  owned: JSON.parse(localStorage.getItem("rekenraket-owned") || "[]"),
  current: null,
};

const coinsEl = document.querySelector("#coins");
const starsEl = document.querySelector("#stars");
const levelEl = document.querySelector("#level");
const starHintEl = document.querySelector("#starHint");
const promptEl = document.querySelector("#prompt");
const missionTypeEl = document.querySelector("#missionType");
const comboEl = document.querySelector("#combo");
const bonusPreviewEl = document.querySelector("#bonusPreview");
const feedbackEl = document.querySelector("#feedback");
const progressBarEl = document.querySelector("#progressBar");
const answerForm = document.querySelector("#answerForm");
const answerInput = document.querySelector("#answerInput");
const quickChoices = document.querySelector("#quickChoices");
const mixedModeButton = document.querySelector("#mixedModeButton");
const tablesModeButton = document.querySelector("#tablesModeButton");
const tablePicker = document.querySelector("#tablePicker");
const shopGrid = document.querySelector("#shopGrid");
const rocketWrap = document.querySelector(".rocket-wrap");
const rewardCharm = document.querySelector(".reward-charm");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function save() {
  localStorage.setItem("rekenraket-coins", state.coins);
  localStorage.setItem("rekenraket-stars", state.stars);
  localStorage.setItem("rekenraket-level", state.level);
  localStorage.setItem("rekenraket-mode", state.mode);
  localStorage.setItem("rekenraket-table", state.table);
  localStorage.setItem("rekenraket-progress", state.correctThisStar);
  localStorage.setItem("rekenraket-owned", JSON.stringify(state.owned));
}

function updateStats() {
  coinsEl.textContent = state.coins;
  starsEl.textContent = state.stars;
  levelEl.textContent = state.level;
  comboEl.textContent = `Combo x${state.combo}`;
  bonusPreviewEl.textContent = `+${comboBonus()}`;
  starHintEl.textContent = `Nog ${STAR_GOAL - state.correctThisStar} goed`;
  mixedModeButton.classList.toggle("active", state.mode === "mixed");
  tablesModeButton.classList.toggle("active", state.mode === "tables");
  tablePicker.hidden = state.mode !== "tables";
  progressBarEl.style.width = `${(state.correctThisStar / STAR_GOAL) * 100}%`;
  applyRewards();
}

function comboBonus() {
  return (state.combo - 1) * COMBO_STEP;
}

function applyRewards() {
  rocketWrap.classList.toggle("trail", state.owned.includes("trail"));
  rocketWrap.classList.toggle("star", state.owned.includes("star") && !state.owned.includes("crown"));
  rocketWrap.classList.toggle("crown", state.owned.includes("crown"));
  rewardCharm.textContent = state.owned.includes("crown") ? "♛" : state.owned.includes("star") ? "★" : "";
}

function makeProblem() {
  if (state.mode === "tables") {
    const a = state.table;
    const b = randomInt(1, 10);
    const answer = a * b;
    state.current = { answer, text: `${a} x ${b} = ?`, mission: `Tafel van ${a}` };
    promptEl.textContent = state.current.text;
    missionTypeEl.textContent = state.current.mission;
    answerInput.value = "";
    answerInput.focus();
    renderChoices(answer);
    return;
  }

  const available = state.level < 3 ? missions.slice(0, 2) : missions;
  const mission = available[randomInt(0, available.length - 1)];
  let a = randomInt(mission.min, mission.max + state.level * 2);
  let b = randomInt(mission.min, mission.max + state.level * 2);

  if (mission.sign === "-" && b > a) {
    [a, b] = [b, a];
  }

  if (mission.sign === "x") {
    a = randomInt(1, 10);
    b = randomInt(1, 10);
  }

  const answer = mission.make(a, b);
  state.current = { answer, text: `${a} ${mission.sign} ${b} = ?`, mission: mission.name };
  promptEl.textContent = state.current.text;
  missionTypeEl.textContent = state.current.mission;
  answerInput.value = "";
  answerInput.focus();
  renderChoices(answer);
}

function renderChoices(answer) {
  const nearby = new Set([answer]);
  while (nearby.size < 4) {
    nearby.add(Math.max(0, answer + randomInt(-8, 8)));
  }

  quickChoices.innerHTML = "";
  shuffle([...nearby]).forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.textContent = choice;
    button.addEventListener("click", () => checkAnswer(String(choice)));
    quickChoices.append(button);
  });
}

function celebrate() {
  rocketWrap.classList.add("boost");
  window.setTimeout(() => rocketWrap.classList.remove("boost"), 300);
}

function checkAnswer(value) {
  const guess = Number(value || answerInput.value);
  if (!Number.isFinite(guess)) {
    feedbackEl.textContent = "Typ een getal of kies een knop.";
    feedbackEl.className = "feedback try";
    return;
  }

  if (guess === state.current.answer) {
    const earned = BASE_COINS + comboBonus();
    state.coins += earned;
    state.correctThisStar += 1;
    feedbackEl.textContent = `Goed! ${BASE_COINS} munten + ${comboBonus()} combo = +${earned}.`;
    feedbackEl.className = "feedback good";
    state.combo = Math.min(state.combo + 1, 5);
    celebrate();

    if (state.correctThisStar >= STAR_GOAL) {
      state.correctThisStar = 0;
      state.stars += 1;
      state.coins += STAR_BONUS;
      state.level += state.stars % 2 === 0 ? 1 : 0;
      feedbackEl.textContent = `Ster verdiend! +${STAR_BONUS} bonusmunten erbij.`;
    }

    save();
    updateStats();
    window.setTimeout(makeProblem, 650);
    return;
  }

  state.combo = 1;
  feedbackEl.textContent = "Bijna. Kijk nog eens rustig naar de som.";
  feedbackEl.className = "feedback try";
  updateStats();
  answerInput.select();
}

function renderShop() {
  shopGrid.innerHTML = "";
  rewards.forEach((reward) => {
    const item = document.createElement("article");
    const owned = state.owned.includes(reward.id);
    item.className = `shop-item${owned ? " owned" : ""}`;
    item.innerHTML = `
      <div class="badge" aria-hidden="true">${reward.icon}</div>
      <p>${reward.label}</p>
      <button type="button">${owned ? "Van jou" : `${reward.cost} munten`}</button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      if (owned) {
        feedbackEl.textContent = `${reward.label} zit al op je raket.`;
        feedbackEl.className = "feedback good";
        return;
      }

      if (state.coins < reward.cost) {
        feedbackEl.textContent = `Nog ${reward.cost - state.coins} munten nodig.`;
        feedbackEl.className = "feedback try";
        return;
      }

      state.coins -= reward.cost;
      state.owned.push(reward.id);
      feedbackEl.textContent = `${reward.label} gekocht!`;
      feedbackEl.className = "feedback good";
      save();
      updateStats();
      renderShop();
    });

    shopGrid.append(item);
  });
}

function renderTables() {
  tablePicker.innerHTML = "";
  for (let number = 1; number <= 10; number += 1) {
    const button = document.createElement("button");
    button.className = `table-button${number === state.table ? " active" : ""}`;
    button.type = "button";
    button.textContent = number;
    button.setAttribute("aria-label", `Tafel van ${number}`);
    button.addEventListener("click", () => {
      state.mode = "tables";
      state.table = number;
      state.correctThisStar = 0;
      state.combo = 1;
      feedbackEl.textContent = `Je oefent nu de tafel van ${number}.`;
      feedbackEl.className = "feedback";
      save();
      renderTables();
      updateStats();
      makeProblem();
    });
    tablePicker.append(button);
  }
}

answerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  checkAnswer(answerInput.value);
});

document.querySelector("#resetButton").addEventListener("click", () => {
  localStorage.removeItem("rekenraket-coins");
  localStorage.removeItem("rekenraket-stars");
  localStorage.removeItem("rekenraket-level");
  localStorage.removeItem("rekenraket-mode");
  localStorage.removeItem("rekenraket-table");
  localStorage.removeItem("rekenraket-progress");
  localStorage.removeItem("rekenraket-owned");
  Object.assign(state, { coins: 0, stars: 0, level: 1, mode: "mixed", table: 1, combo: 1, correctThisStar: 0, owned: [] });
  feedbackEl.textContent = "Nieuwe vlucht gestart.";
  feedbackEl.className = "feedback";
  save();
  updateStats();
  renderShop();
  renderTables();
  makeProblem();
});

mixedModeButton.addEventListener("click", () => {
  state.mode = "mixed";
  state.combo = 1;
  state.correctThisStar = 0;
  feedbackEl.textContent = "Gemengde missies staan klaar.";
  feedbackEl.className = "feedback";
  save();
  updateStats();
  makeProblem();
});

tablesModeButton.addEventListener("click", () => {
  state.mode = "tables";
  state.combo = 1;
  state.correctThisStar = 0;
  feedbackEl.textContent = `Kies of oefen de tafel van ${state.table}.`;
  feedbackEl.className = "feedback";
  save();
  updateStats();
  makeProblem();
});

updateStats();
renderShop();
renderTables();
makeProblem();
