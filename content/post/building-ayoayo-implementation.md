---
title: 'Building Ayòayò: Implementation'
date: 2020-06-14T15:21:03+01:00
draft: false
thumbnail: 'https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_300/v1592147195/Children_gather_over_a_game_of_Ayo.jpg'
images:
  [
    'https://res.cloudinary.com/cwilliams/image/upload/v1592147195/Children_gather_over_a_game_of_Ayo.jpg',
  ]
tags: [algorithms, javascript]
series: [Building Ayoayo]
description: This is the first post in the Building Ayòayò series. I explore the history and rules of the game and implement the game logic with JavaScript.
---

This is the first post in the [Building Ayòayò](/series/building-ayoayo) series. The series will cover different aspects of building a simple web-based game with JavaScript.

In this post, we'll explore the history and rules of the game. We'll also implement the game logic with JavaScript.

I hope you enjoy reading this series and learning about the beautiful game of Ayòayò!

## A brief history

Ayòayò [*ah-yo-ah-yo*], or just Ayò, is a variant of mancala played by the Yoruba people in Nigeria.

[Mancala](https://en.wikipedia.org/wiki/Mancala) is a family of strategy board games where two players take turns moving beans or small stones around holes in a board or the earth. Other popular mancala games include:

- Ali Guli Mane, from Southern India.
- Oware (Awalé, Awélé, Awari), from the Ashanti region of Ghana.
- Bao la Kiswahili, from East Africa.

The history of mancala dates back to ancient times in Egypt [as far back as 1000 BC](https://books.google.com.ng/books?id=IyFHvy-SCIYC&lpg=PA22&dq=mancala%20middle%20east&pg=PA22#v=onepage&q=mancala%20middle%20east&f=false). Since then, the game and its variants have spread all around the world.

{{< external-image
  title="Dotun55 / CC BY-SA (<https://creativecommons.org/licenses/by-sa/4.0>)"
  href="https://commons.wikimedia.org/wiki/File:Children_gather_over_a_game_of_Ayo.jpg"
  alt="Children gather over a game of Ayo"
  src="https://res.cloudinary.com/cwilliams/image/upload/v1592147195/Children_gather_over_a_game_of_Ayo.jpg" >}}

## Rules of the game

In this section, we'll discuss how to play the game of Ayòayò. Depending on who, or where, you ask, the game rules may be slightly different. But these are the rules I learned to play with growing up in Lagos, Nigeria.

1. The game **board** has two rows: one for each **player**. Each **row** has six **pits.** The game begins with four **seeds** in each pit.
2. On a player's turn, they scoop up all the seeds in one of their pits and **sow**. They drop the seeds one-by-one into subsequent holes in a **counter-clockwise motion**. Then it becomes the next player's turn.
3. If a seed lands on a pit with three seeds and the player still has seeds left to sow, the owner of that row **captures** the four seeds in that pit. Then sowing resumes. If the player has no seeds left to sow, _they_ capture the seeds.
4. If the last seed lands on an occupied pit (except it has three seeds), the player scoops up all the seeds in that pit and immediately re-sows from the next pit. This is called **relay sowing**.
5. If a player ends their turn with no seeds left in their pits, the next player must **"feed"** them. To feed, the next player chooses a move that leaves the opponent with seeds to play on their turn. If such a move is not possible, the player with seeds left in their row captures all the remaining seeds and the game ends. The player with more seeds wins.
6. If a player captures more than 24 seeds, they immediately win the game.

![Ayoayo: Direction of Play](https://res.cloudinary.com/cwilliams/image/upload/v1592055237/Ayoayo_-_Direction_of_Play.webp)

## The implementation

### Rule #1

> The game board has two rows: one for each player. Each row has six pits. The game begins with four seeds in each pit.

We'll start by creating an object constructor, `Ayoayo`, with properties for the board state and the index of the next player.

The next player owns the row in `this.board[this.nextPlayer]`.

```jsx
function Ayoayo() {
  this.board = [
    [4, 4, 4, 4, 4, 4],
    [4, 4, 4, 4, 4, 4],
  ];
  this.nextPlayer = 0;
}
```

### Rule #2

> On a player's turn, they scoop up all the seeds in one of their pits and sow. They drop the seeds one-by-one into subsequent holes in a counter-clockwise motion. Then it becomes the next player's turn.

Let's create a function that will report what moves the next player can make. For now, the next player may play any non-empty cell in their row. In Rule #6, we'll add another constraint.

```jsx
Ayoayo.prototype.getPermissibleMoves = function getPermissibleMoves() {
  // Returns all non-empty cell indexes in nextPlayer's row
  return this.board[this.nextPlayer]
    .map((_, index) => index)
    .filter((cellIndex) => board[player][cellIndex] > 0);
};
```

Next, we'll create a function to perform sowing. The function will pick up the seeds in a cell and drop them in a counter-clockwise motion.

```jsx
Ayoayo.prototype.relaySow = function relaySow(cell) {
  // Pickup seeds
  let numSeedsInHand = this.board[this.nextPlayer][cell];
  board[this.nextPlayer][cell] = 0;

  // Move to the next cell
  let [nextPositionRow, nextPositionCell] = Ayoayo.next(this.nextPlayer, cell);

  // Stop sowing if there are no more seeds left to play
  while (numSeedsInHand > 0) {
    // Drop one seed in next cell
    board[nextPositionRow][nextPositionCell]++;
    numSeedsInHand--;

    // Move to the next cell
    [nextPositionRow, nextPositionCell] = Ayoayo.next(nextPositionRow, nextPositionCell);
  }
};

Ayoayo.NUM_CELLS_PER_ROW = 6;

Ayoayo.next = function next(row, cell) {
  // At the top row, move left. Jump down at the first cell.
  if (row == 0) return cell == 0 ? [1, 0] : [0, cell - 1];
  // At the bottom row, move right. Jump up at the last cell.
  return cell == Ayoayo.NUM_CELLS_PER_ROW - 1
    ? [0, Ayoayo.NUM_CELLS_PER_ROW - 1]
    : [1, cell + 1];
};
```

Finally, we'll write the main `play()` function. For now, the function simply checks that the cell is playable and calls `relaySow()`. After sowing, the function toggles the turn to the next player.

```jsx
Ayoayo.prototype.play = function play(cell) {
  if (!this.getPermissibleMoves().includes(cell)) {
    throw new Error('Not permitted to play this cell');
  }

  this.relaySow(cell);

  this.nextPlayer = (this.nextPlayer + 1) % 2;
};
```

### Rule #3

> If a seed lands on a pit with three seeds and the player still has seeds left to sow, the owner of that row captures the four seeds in that pit. Then sowing resumes. If the player has no seeds left to sow, they capture the seeds.

This rule introduces the concept of capturing. We'll create a `captured` property and initialize it to `[0, 0]`. The `relaySow()` function will increment the captured values when the rule condition occurs.

```jsx
// this.captured = [0, 0];

// In the sowing loop...
// After dropping the seed in the cell...
// If the cell has four seeds, capture. If this is the last seed in hand,
// give to the current player. If not, give to the owner of the row.
if (this.board[nextPositionRow][nextPositionCell] == 4) {
  const capturer = numSeedsInHand == 0 ? this.nextPlayer : nextPositionRow;
  this.captured[capturer] += 4;
  board[nextPositionRow][nextPositionCell] = 0;
}
// Move to next cell
```

### Rule #4

> If the last seed lands on an occupied pit (except it has three seeds), the player scoops up all the seeds in that pit and immediately re-sows from the next pit.

We'll now add the condition for relay sowing to the `relaySow` function:

```jsx
// In the sowing loop...
// After dropping the seed in the cell...
// ... and capturing, if possible...
// Relay-sow. If this is the last seed in hand and the cell was
// not originally empty, pickup the seeds in the cell and continue moving.
if (numSeedsInHand == 0 && this.board[nextPositionRow][nextPositionCell] > 1) {
  numSeedsInHand = this.board[nextPositionRow][nextPositionCell];
  this.board[nextPositionRow][nextPositionCell] = 0;
}
// Move to next cell
```

### Rule #5

> If a player ends their turn with no seeds left in their pits, the next player must feed them. To feed, the next player chooses a move that leaves the opponent with seeds to play on their turn. If such a move is not possible, the player with seeds left in their row captures all the remaining seeds and the game ends. The player with more seeds wins.

To satisfy this rule, we'll add another filter to the permissible moves.

The filter will play each move against a copy of the current board state. Then, it will select only the moves that leave the next player's opponent with at least one seed in their row.

In `getPermissibleMoves()`, we'll add the following:

```jsx
const otherPlayer = Ayoayo.togglePlayer(this.nextPlayer);
const otherPlayerHasSeeds = this.board[otherPlayer].some((cell) => cell > 0);

if (!otherPlayerHasSeeds) {
  return nonEmptyCellIndexes.filter((cellIndex) => {
    const boardCopy = this.board.map((row) => row.slice());
    const [boardIfCellPlayed] = Ayoayo.relaySow(boardCopy, player, cellIndex);
    // Return true if the other player has at least one cell
    return boardIfCellPlayed[otherPlayer].some((cell) => cell > 0);
  });
}
```

If you followed closely, you may have noticed that we modified `relaySow()` to accept the board and player as parameters. This way, we don't need to copy the entire `Ayoayo` object to simulate the sowing.

Next, we'll update `play()` with the winning condition.

```jsx
// After relay sowing and toggling player...
// If next player can't move, capture remaining seeds. Game over.
if (this.permissibleMoves.length == 0) {
  let numRemainingSeeds = 0;
  this.board[this.nextPlayer] = this.board[this.nextPlayer].map((cell, index) => {
    numRemainingSeeds += cell;
    return 0;
  });
  this.captured[this.nextPlayer] += numRemainingSeeds;
  this.isGameOver = true;
  this.winner = Ayoayo.getWinner(this.captured);
}

// Ayoayo.getWinner = function getWinner(captured) {
//  if (captured[0] > captured[1]) return 0;
//  if (captured[1] > captured[0]) return 1;
//  return -1;
// };
```

### Rule #6

> If a player captures more than 24 seeds, they immediately win the game.

For the sixth and final rule, we'll add a little more logic to `play()` for a "quick win". If a player has more than half of all seeds, it's impossible for the other to win or draw. _Game over!_

```jsx
if (this.captured.some((count) => count > Ayoayo.TOTAL_NUM_SEEDS / 2)) {
  this.isGameOver = true;
  this.winner = Ayoayo.getWinner(this.captured);
}
```

The basic gameplay is now all done. Check out [the complete source code for this implementation](/code/building-ayoayo-implementation/).

In the next post in this series, we'll build a simple Node console application for Ayòayò.

The complete project for the Ayòayò series is available [on GitHub](https://github.com/chidiwilliams/ayoayo/).
