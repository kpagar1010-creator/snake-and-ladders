const board = document.querySelector('#board');
const rollButton = document.querySelector('#roll-button');
const restartButton = document.querySelector('#restart-button');
const diceDisplay = document.querySelector('#dice');
const message = document.querySelector('#message');
const turnName = document.querySelector('#turn-name');
const turnHint = document.querySelector('#turn-hint');
const ladderStarts = [4, 9, 20, 28, 40, 51, 63, 71];
const snakeStarts = [17, 54, 62, 64, 87, 93, 95, 99];
const cells = new Map();

// Traditional alternating row direction: 1 starts at the bottom left; 100 ends top left.
for (let row = 9; row >= 0; row--) {
  const rowNumbers = Array.from({length: 10}, (_, i) => row % 2 === 0 ? row * 10 + i + 1 : row * 10 + 10 - i);
  for (const number of rowNumbers) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    cell.dataset.square = number;
    cell.textContent = number === 1 ? '1 · START' : number === 100 ? '100 · FINISH' : number;
    if (number === 1) cell.classList.add('start');
    if (number === 100) cell.classList.add('finish');
    if (ladderStarts.includes(number)) cell.classList.add('special-ladder');
    if (snakeStarts.includes(number)) cell.classList.add('special-snake');
    const tokens = document.createElement('div');
    tokens.className = 'tokens';
    cell.append(tokens);
    board.append(cell);
    cells.set(number, cell);
  }
}

// Play immediately even before the optional Emscripten build has been generated.
// When game_module.js/game_module.wasm are present, the C implementation is used.
let wasm = Promise.resolve(null);
if (typeof SnakeGame === 'function') {
  wasm = SnakeGame().catch(() => null);
}

const ladders = new Map([[4,14],[9,31],[20,38],[28,84],[40,59],[51,67],[63,81],[71,91]]);
const snakes = new Map([[17,7],[54,34],[62,19],[64,60],[87,24],[93,73],[95,75],[99,78]]);
const localGame = {positions:[0,0], current:1, winner:0, event:0, from:0, to:0};

function draw(exports = null) {
  for (const cell of cells.values()) cell.querySelector('.tokens').replaceChildren();
  for (let player = 1; player <= 2; player++) {
    const position = exports ? exports._game_get_position(player - 1) >>> 0 : localGame.positions[player - 1];
    document.querySelector(`#p${player}-position`).textContent = position ? `Square ${position}` : 'Start';
    if (position) {
      const token = document.createElement('span');
      token.className = `token p${player}`;
      token.title = `Player ${player}`;
      token.setAttribute('aria-label', `Player ${player}`);
      cells.get(position).querySelector('.tokens').append(token);
    }
  }
  const winner = exports ? exports._game_get_winner() >>> 0 : localGame.winner;
  const current = exports ? exports._game_get_current_player() >>> 0 : localGame.current;
  turnName.textContent = winner ? `Player ${winner} wins!` : `Player ${current}`;
  turnHint.textContent = winner ? 'A perfect finish!' : 'Your turn to roll.';
  rollButton.disabled = Boolean(winner);
}

function playInJavaScript(roll) {
  const player = localGame.current;
  const index = player - 1;
  const oldPosition = localGame.positions[index];
  const proposed = oldPosition + roll;
  localGame.event = localGame.from = localGame.to = 0;
  if (proposed > 100) {
    localGame.event = 3;
  } else {
    localGame.positions[index] = proposed;
    const destination = ladders.get(proposed) ?? snakes.get(proposed);
    if (destination !== undefined) {
      localGame.from = proposed;
      localGame.to = destination;
      localGame.event = destination > proposed ? 1 : 2;
      localGame.positions[index] = destination;
    }
    if (localGame.positions[index] === 100) localGame.winner = player;
  }
  if (!localGame.winner) localGame.current = player === 1 ? 2 : 1;
  return player;
}

rollButton.addEventListener('click', async () => {
  // Math.random works for locally opened pages too; the range is always 1 through 6.
  const roll = Math.floor(Math.random() * 6) + 1;
  const exports = await wasm;
  const player = exports ? exports._game_move(roll) >>> 0 : playInJavaScript(roll);
  const winner = exports ? exports._game_get_winner() >>> 0 : localGame.winner;
  const event = exports ? exports._game_get_event_type() >>> 0 : localGame.event;
  const from = exports ? exports._game_get_event_from() >>> 0 : localGame.from;
  const to = exports ? exports._game_get_event_to() >>> 0 : localGame.to;
  const position = exports ? exports._game_get_position(player - 1) >>> 0 : localGame.positions[player - 1];
  diceDisplay.textContent = ['⚀','⚁','⚂','⚃','⚄','⚅'][roll - 1];
  if (winner) message.textContent = `Player ${player} rolled ${roll} and reached square 100. You win!`;
  else if (event === 1) message.textContent = `Player ${player} rolled ${roll}, landed on ${from}, and climbed the ladder to ${to}!`;
  else if (event === 2) message.textContent = `Player ${player} rolled ${roll}, landed on ${from}, and slid down the snake to ${to}.`;
  else if (event === 3) message.textContent = `Player ${player} rolled ${roll}, but needs an exact roll for 100. Stay put!`;
  else message.textContent = `Player ${player} rolled ${roll} and moved to square ${position}.`;
  draw(exports);
});

restartButton.addEventListener('click', async () => {
  const exports = await wasm;
  if (exports) exports._game_reset();
  Object.assign(localGame, {positions:[0,0], current:1, winner:0, event:0, from:0, to:0});
  diceDisplay.textContent = '–';
  message.textContent = 'Player 1, roll to begin!';
  turnHint.textContent = 'Ready when you are.';
  draw(exports);
});

wasm.then(draw);
