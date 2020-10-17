---
title: 'Building Ayòayò: Web Application'
date: 2020-06-27T16:00:00+01:00
draft: false
series: [Building Ayoayo]
tags: [algorithms, javascript]
description: In the previous posts in this series, we wrote the game logic for Ayòayò and built a CLI application. In this post, we’ll build an interactive web application for the game with JavaScript.
images:
  [
    https://res.cloudinary.com/cwilliams/image/upload/v1593099586/Ayoayo_Web_App_Post_1.png,
  ]
---

In the previous posts in this series, we wrote the game logic for Ayòayò and built a CLI application. In this post, we’ll build an interactive web application for the game with JavaScript.

We'll focus on the gameplay and animations here. For the styling and more, see the complete source code [on GitHub](https://github.com/chidiwilliams/ayoayo/tree/master/ayoayo-web).

{{< video src="https://res.cloudinary.com/cwilliams/video/upload/v1593098658/Video_MP4_796x400.mp4" title="Demo of Ayòayò web app" >}}

## Setting the Stage

We'll begin by creating the HTML elements for the game's entities.

The game board has two rows, each with six pits. At the start of the game, each pit holds four seeds. We'll represent these with the following ([Emmet-abbreviated](https://docs.emmet.io/cheat-sheet/)) HTML elements:

```text
.board>.row*2>.pit*6>.seed*4
```

We'll also create elements to store each player's captured seeds and show the player's name.

Next, we'll create two "hands". The first hand will sow the seeds, moving them from one pit to another. The other will capture the seeds and move them from a pit to a player's store.

We'll discuss how the sowing and capturing actions work later. For now, these hands are simple transparent, absolutely-positioned `<div>`s.

```html
<div class="hand sowing"></div>
<div class="hand capturing"></div>
```

Lastly, we'll add a button for starting a new game.

```html
<button class="new-game">New Game</button>
```

## Game Interactions

In the CLI application we built in the previous post, the console printed out the updated state of the game after each turn.

In this web application, however, displaying only the final game states is inadequate. We also want to show the _micro-events_ that happen during the turn: picking up seeds, moving, sowing, capturing.

There are multiple ways we can implement this behaviour, but for this app, we'll use an event-driven approach. The `Ayoayo` game object will emit Node.js events when actions happen, and the client---the web app, in this case---will listen for and act on them.

We'll extend `Ayoayo` to inherit from `events.EventEmitter` and then define a few event types.

```js
const util = require('util');
const events = require('events');

function Ayoayo() {
  /* ... */
}

Ayoayo.events = {
  PICKUP_SEEDS: 'pickup_seeds',
  MOVE_TO: 'move_to',
  DROP_SEED: 'drop_seed',
  SWITCH_TURN: 'switch_turn',
  CAPTURE: 'capture',
  GAME_OVER: 'game_over',
};

util.inherits(Ayoayo, events.EventEmitter);
```

Then, we'll add different `this.emit()` calls to the parts of the `Ayoayo` code where these events happen. For example, when a player drops a seed in a cell, we'll emit the `DROP_SEED` event and provide the pit's row and column indexes as arguments.

```js
this.emit(Ayoayo.events.DROP_SEED, row, column);
```

## Events on the Web

Now, we have a way to get notified when the game events happen. We can return to writing the web app.

When the user clicks the "New Game" button, we'll create a new instance of `Ayoayo` and add event listeners to it. When they click a pit, we'll call the `play()` function with the cell's index.

```js
let game;

const newGameButton = document.querySelector('button.new-game');
const pits = document.querySelectorAll('.side .pit');

newGameButton.addEventListener('click', onClickNewGame);
pits.forEach((pit) => {
  pit.addEventListener('click', onClickPit);
});

function onClickNewGame() {
  game = new Ayoayo();
  game.on(Ayoayo.events.PICKUP_SEEDS, onPickupSeeds);
  game.on(Ayoayo.events.MOVE_TO, onMoveTo);
  game.on(Ayoayo.events.DROP_SEED, onDropSeed);
  game.on(Ayoayo.events.SWITCH_TURN, onSwitchTurn);
  game.on(Ayoayo.events.CAPTURE, onCapture);
  game.on(Ayoayo.events.GAME_OVER, onGameOver);
}

function onClickPit(evt) {
  // Pits have class names numbered like "pit-1", "pit-2", "pit-3".
  // So, className[4] will return the pit's column index.
  // E.g. "pit-2"[4] => "2"
  const startIndexOfCellIndex = 4;
  const cellIndex = evt.currentTarget.classList
    .toString()
    .split(' ')
    .find((className) => className.includes('pit-'))[startIndexOfCellIndex];
  game.play(cellIndex - 1);
}
```

### Handling the Events

When we receive events from the `Ayoayo` instance, we'll push them onto a queue. This way, we can execute the events in the same order we received them.

We'll update the event listener callbacks to enqueue received events.

```js
let eventQueue = [];

const onPickupSeeds = onGameEvent(Ayoayo.events.PICKUP_SEEDS);
const onMoveTo = onGameEvent(Ayoayo.events.MOVE_TO);
const onDropSeed = onGameEvent(Ayoayo.events.DROP_SEED);
const onSwitchTurn = onGameEvent(Ayoayo.events.SWITCH_TURN);
const onCapture = onGameEvent(Ayoayo.events.CAPTURE);
const onGameOver = onGameEvent(Ayoayo.events.GAME_OVER);

// Returns a new game event listener function
function onGameEvent(type) {
  return function (...args) {
    eventQueue.push({ type, args });
  };
}
```

Each `eventQueue` element will contain the event's type and arguments.

On each animation frame, we'll dequeue the next event and execute it.

```js
let eventQueue = [],
  currentEvent;

const EVENT_DURATION = 200; // milliseconds

requestAnimationFrame(handleEventQueue);

function handleEventQueue(time) {
  // Restart till there's an event to execute
  if (eventQueue.length == 0) {
    requestAnimationFrame(handleEventQueue);
    return;
  }

  // Dequeue the next event and mark its start time
  if (!currentEvent) {
    currentEvent = eventQueue.shift();
    currentEvent.start = time;
  }

  // Calculate what fraction of the total event duration has passed at this point
  const fractionDone = (time - currentEvent.start) / EVENT_DURATION;

  // End the current animation/event if completed
  if (fractionDone >= 1) {
    currentEvent = null;
    requestAnimationFrame(handleEventQueue);
    return;
  }

  // Handle the current event
  const handler = eventTypeToHandler[currentEvent.type];
  handler(currentEvent, fractionDone);

  requestAnimationFrame(handleEventQueue);
}
```

`eventTypeToHandler` is a map of event types to their respective handler functions. Each handler function expects the event object and the fractional animation progress as its arguments.

```js
const eventTypeToHandler = {
  [Ayoayo.events.PICKUP_SEEDS]: handlePickupSeedsEvent,
  [Ayoayo.events.MOVE_TO]: handleMoveToEvent,
  [Ayoayo.events.DROP_SEED]: handleDropSeedEvent,
  [Ayoayo.events.SWITCH_TURN]: handleSwitchTurnEvent,
  [Ayoayo.events.CAPTURE]: handleCaptureEvent,
  [Ayoayo.events.GAME_OVER]: handleGameOverEvent,
};
```

We'll now discuss what the handler functions do.

### handlePickupSeedsEvent

Each game turn begins with a player picking up seeds from a pit. We'll transfer the `.seed` children in the selected pit's element to the sowing hand.

```js
const sowingHand = document.querySelector('.hand.sowing');

function handlePickupSeedsEvent(event, fractionDone) {
  // Run only once
  if (fractionDone == 0) {
    const [row, column] = event.args;

    // Set the position of the sowing hand to the pickup point
    const [handX, handY] = getPitPosition(row, column);
    sowingHand.style.left = `${handX}px`;
    sowingHand.style.top = `${handY}px`;

    // Transfer the seeds from the pit to the sowing hand
    const pit = getPitAtPosition(row, column);
    const seeds = pit.querySelectorAll(`.seed`);
    seeds.forEach((seed) => {
      pit.removeChild(seed);
      sowingHand.appendChild(seed);
    });
  }
}

// Returns the [x, y] coordinates (in pixels, relative
// to the board) of the pit at the given row and column
function getPitPosition(row, column) {
  const pit = getPitAtPosition(row, column);
  const pitRect = pit.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  return [pitRect.x - boardRect.x, pitRect.y - boardRect.y];
}

// Returns the pit element at the given row and column
function getPitAtPosition(row, column) {
  return document.querySelector(`.side-${row + 1} .pit-${column + 1}`);
}
```

### handleMoveToEvent

The `MOVE_TO` event handler translates the sowing hand from one pit to the next.

We'll calculate the coordinates of the sowing hand as a fraction along the distance between the two pits. At `fractionDone == 0`, the sowing hand will be at the first pit. At `fractionDone == 1`, it will be at the next one.

```js
function handleMoveToEvent(event, fractionDone) {
  const [[initialRow, initialColumn], [nextRow, nextColumn]] = event.args;

  const [initialPitX, initialPitY] = getPitPosition(initialRow, initialColumn);
  const [nextPitX, nextPitY] = getPitPosition(nextRow, nextColumn);

  const currentHandX = initialPitX + fractionDone * (nextPitX - initialPitX);
  const currentHandY = initialPitY + fractionDone * (nextPitY - initialPitY);
  sowingHand.style.left = `${currentHandX}px`;
  sowingHand.style.top = `${currentHandY}px`;
}
```

### handleDropSeedEvent

Next, we'll handle the `DROP_SEED` event by removing a seed from the sowing hand and appending it to the receiving pit.

```js
function handleDropSeedEvent(event, fractionDone) {
  if (fractionDone == 0) {
    const seedInHand = sowingHand.querySelector('.seed');
    sowingHand.removeChild(seedInHand);

    const [row, column] = event.args;
    const pit = getPitAtPosition(row, column);
    pit.appendChild(seedInHand);
  }
}
```

### handleSwitchTurnEvent

At the end of each turn, we'll display a badge to show the user who should play next.

```js
// HTML: Each .player has a <span class="turn-badge">Your turn!</span>.

const turnBadges = document.querySelectorAll('.turn-badge');

function handleSwitchTurnEvent(event, fractionDone) {
  if (fractionDone == 0) {
    const [nextPlayer] = event.args;
    const otherPlayer = Ayoayo.togglePlayer(nextPlayer);
    turnBadges.item(nextPlayer).style.display = 'inline-block';
    turnBadges.item(otherPlayer).style.display = 'none';
  }
}
```

### handleCaptureEvent

For the `CAPTURE` event, we'll first transfer the seeds from the captured pit to the capturing hand. Then, we'll move the capturing hand to the player's store.

```js
const capturingHand = document.querySelector('.hand.capturing');

function handleCaptureEvent(event, fractionDone) {
  const [row, column, capturingPlayer] = event.args;

  const pit = getPitAtPosition(row, column);
  const seedsInPit = pit.querySelectorAll('.seed');
  seedsInPit.forEach((seed) => {
    pit.removeChild(seed);
    capturingHand.appendChild(seed);
  });

  const [pitX, pitY] = getPitPosition(row, column);
  const [captureStoreX, captureStoreY] = getCaptureStorePosition(
    capturingPlayer,
  );
  const currentHandX = pitX + fractionDone * (captureStoreX - pitX);
  const currentHandY = pitY + fractionDone * (captureStoreY - pitY);
  capturingHand.style.left = `${currentHandX}px`;
  capturingHand.style.top = `${currentHandY}px`;
}

// Returns the coordinates of the player's capture store
function getCaptureStorePosition(row, column) {}
```

### handleGameOverEvent

Finally, at the end of the game, we'll tell the user which player won the game.

```js
function handleGameOverEvent(event, fractionDone) {
  if (fractionDone == 0) {
    const [winner] = event.args;

    if (winner == -1) {
      winnerBadges.forEach((badge) => {
        badge.textContent = 'Draw!';
      });
      return;
    }

    const badge = winnerBadges.item(winner);
    badge.textContent = 'Winner!';
  }
}
```

That's all we need for the web application. Have a go at [the game](https://chidiwilliams.github.io/ayoayo).

In the next---and final---post in this series, we'll build an unbeatable AI player.

The complete project for the Ayòayò series is available [on GitHub](https://github.com/chidiwilliams/ayoayo/).
