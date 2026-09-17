const diceCountInput = document.querySelector('#dice-count');
const diceCountValue = document.querySelector('#dice-count-value');
const diceStage = document.querySelector('#dice-stage');
const totalValue = document.querySelector('#total-value');
const rollMeta = document.querySelector('#roll-meta');
const rollButton = document.querySelector('#roll-button');
const historyList = document.querySelector('#history-list');
const clearHistoryButton = document.querySelector('#clear-history');
const diceOptions = document.querySelectorAll('.dice-option');
const stepperButtons = document.querySelectorAll('.stepper-button');

let selectedSides = 8;
let history = [];

function updateCount(value) {
  const count = Math.min(8, Math.max(1, Number(value)));
  diceCountInput.value = count;
  diceCountValue.textContent = count;
  rollMeta.textContent = `${count} 顆 D${selectedSides}`;
}

function rollDice() {
  const count = Number(diceCountInput.value);
  const results = Array.from({ length: count }, () => Math.floor(Math.random() * selectedSides) + 1);
  const total = results.reduce((sum, value) => sum + value, 0);

  diceStage.innerHTML = results.map((value) => `<div class="die" aria-label="擲出 ${value}">${value}</div>`).join('');
  totalValue.textContent = total;
  rollMeta.textContent = `${count} 顆 D${selectedSides}`;
  history.unshift({ results, total, sides: selectedSides });
  history = history.slice(0, 6);
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<li class="empty-history">還沒有紀錄，開始你的第一次擲骰吧。</li>';
    return;
  }

  historyList.innerHTML = history.map((roll, index) => `
    <li class="history-item">
      <span>#${String(history.length - index).padStart(2, '0')} · ${roll.results.length}D${roll.sides}</span>
      <strong>${roll.total}</strong>
    </li>
  `).join('');
}

diceCountInput.addEventListener('input', (event) => updateCount(event.target.value));

stepperButtons.forEach((button) => {
  button.addEventListener('click', () => updateCount(Number(diceCountInput.value) + Number(button.dataset.step)));
});

diceOptions.forEach((button) => {
  button.addEventListener('click', () => {
    selectedSides = Number(button.dataset.sides);
    diceOptions.forEach((option) => option.classList.toggle('is-selected', option === button));
    rollMeta.textContent = `${diceCountInput.value} 顆 D${selectedSides}`;
  });
});

rollButton.addEventListener('click', rollDice);
clearHistoryButton.addEventListener('click', () => {
  history = [];
  renderHistory();
});

updateCount(diceCountInput.value);
renderHistory();
