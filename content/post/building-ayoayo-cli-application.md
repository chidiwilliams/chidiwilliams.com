---
title: 'Building Ayòayò: CLI Application'
date: 2020-06-20T19:13:31+01:00
draft: false
series: [Building Ayoayo]
tags:
  [
    algorithms,
    ayo,
    ayoayo,
    ayò,
    ayòayò,
    game-development,
    javascript,
    js,
    cli,
    node,
  ]
summary: In this post, I implement a CLI for Ayòayò with Node's Readline module.
description: In this post, I implement a CLI for Ayòayò with Node's Readline module.
images:
  [
    https://res.cloudinary.com/cwilliams/image/upload/v1592677234/Building_Ayoayo__CLI_Application.png,
  ]
---

In the [previous post](/post/building-ayoayo-implementation) in the [Building Ayòayò](/series/building-ayoayo) series, we wrote the game logic for Ayòayò with JavaScript. In this post, we'll build a simple Node.js command-line interface (CLI) application to test our implementation.

The command-line application will start a new Ayòayò game, print its board to the console, and then request for inputs from the players until the game ends.

## Ayòayò CLI

We'll use Node's builtin [`readline`](https://nodejs.org/api/readline.html) package to build this CLI.

First, we'll create a `readline.Interface` instance. `readline.Interface` lets us print prompts to an output stream and read back user input from an input stream.

We'll set the input and output streams of the instance to `process.stdin` and `process.stdout` respectively.

```jsx
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});
```

Next, we'll write the function for printing the board and captured values as text.

```jsx
function boardText(board, captured) {
  let str = `\n\n             1      2      3      4      5      6       Captured\n         -------------------------------------------  ------------\n`;

  board.forEach((row, rowIndex) => {
    str += `Player ${rowIndex + 1} |`;
    row.forEach((cell) => {
      str += `  ${padDigit(cell)}  |`;
    });

    const countCaptured = padDigit(captured[rowIndex]);
    str += `  |    ${countCaptured}    |\n         -------------------------------------------  ------------\n`;
  });

  return str;
}

function padDigit(value) {
  return (value < 10 ? ' ' : '') + value;
}
```

`boardText()` returns the board and captured values in a table. The dash and pipe characters draw the borders of the table. `padDigit()` pads single-digit numbers with a preceding space character. This keeps the table layout consistent when the board has cells with both single-digit and double-digit values.

Given a board value of `[[4, 4, 4, 4, 4, 4], [4, 4, 4, 4, 4, 4]]` and captured values of `[0, 0]`, `boardText(board, captured)` will return the following text:

```text
             1      2      3      4      5      6       Captured
         -------------------------------------------  ------------
Player 1 |   4  |   4  |   4  |   4  |   4  |   4  |  |     0    |
         -------------------------------------------  ------------
Player 2 |   4  |   4  |   4  |   4  |   4  |   4  |  |     0    |
         -------------------------------------------  ------------
```

Next, we'll create a new `Ayoayo` game, print its board, and prompt the user for input:

```jsx
const ayoayo = new Ayoayo();

readline.write(boardText(ayoayo.board, ayoayo.captured));

const question = `\nPlayer ${ayoayo.nextPlayer + 1}'s turn. Pick a cell: `;
readline.question(question, (cell) => {
  // Do something with the cell
});
```

We expect the user to respond to the prompt by entering the index of the cell they wish to play (1-6). When we receive this input, we'll first check that the input is a valid number and a permissible move.

```jsx
readline.question(question, (cell) => {
  const cellNum = Number(cell);

  if (Number.isNaN(cellNum) || !ayoayo.permissibleMoves.includes(cellNum - 1)) {
    readline.write('Please enter a valid and allowed cell index.');
    // Request for user input again
    return;
  }

  // Play the cell
});
```

If the user enters an invalid cell, we'll let them know and ask them to play their turn again. To restart the turn, let's rewrite the "questioning" code into a function we can call again if the input is invalid.

```jsx
const ayoayo = new Ayoayo();
requestUserInput();

function requestUserInput() {
  readline.write(boardText(ayoayo.board, ayoayo.captured));

  const question = `\nPlayer ${ayoayo.nextPlayer + 1}'s turn. Pick a cell: `;
  readline.question(question, (cell) => {
    const cellNum = Number(cell);

    if (
      Number.isNaN(cellNum) ||
      !ayoayo.permissibleMoves.includes(cellNum - 1)
    ) {
      readline.write('Please enter a valid and allowed cell index.');
      requestUserInput();
      return;
    }

    // Play the cell
  });
}
```

If we're sure the user has selected a valid cell, we'll play the cell and then request for the next input.

```jsx
ayoayo.play(cellNum - 1);
requestUserInput();
```

Finally, let's handle how the game ends. If `isGameOver` becomes true, we'll report who won the game and then close the streams.

```jsx
if (ayoayo.isGameOver) {
  readline.write(`GAME OVER. Winner: Player ${ayoayo.winner + 1}`);
  readline.close();
  return;
}
```

### ASCII Spice

We've now completed the CLI application. For some spice, let's add some ASCII art.

[patorjk.com](http://patorjk.com/software/taag) has tons of different ASCII fonts you can try out. For our application, we'll use "ANSI Regular".

```text
 █████  ██    ██  ██████   █████  ██    ██  ██████
██   ██  ██  ██  ██    ██ ██   ██  ██  ██  ██    ██
███████   ████   ██    ██ ███████   ████   ██    ██
██   ██    ██    ██    ██ ██   ██    ██    ██    ██
██   ██    ██     ██████  ██   ██    ██     ██████
```

_Retro!_

Finally, let's see the CLI in action:

{{<video src="https://res.cloudinary.com/cwilliams/image/upload/v1592592544/ayoayo-cli.mp4" title="Demo of Ayòayò CLI">}}

Check out [the complete source code for this CLI](/code/the-source-code-of-the-ayoayo-cli-application).

While this CLI is simple (only about 70 lines long) and shows how the game works, it's not very interactive. In the next post in this series, we'll build a web application for the game with HTML, CSS, and JavaScript.

The complete project for the Ayòayò series is available [on GitHub](https://github.com/chidiwilliams/ayoayo/).
