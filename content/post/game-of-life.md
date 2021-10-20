---
title: The Game Called Life
date: 2021-10-16T14:23:28+01:00
draft: false
url: game-of-life
description: On the history and implementation of John Conway's Game of Life
footnotes: 'Thanks to Ayomide Oyekanmi and Opeyemi Onikute for reviewing drafts of this.'
images:
  [
    'https://res.cloudinary.com/cwilliams/image/upload/v1634464272/Blog/pexels-photo-2102850.jpg',
  ]
---

As long as humans have been around, we have been exploring: by curiously wandering into unknown wildernesses by foot; by sailing across seas to seek out distant lands; by sending high-speed spacecraft to investigate moons and planets billions of kilometres away.

At each step in the history of exploration, we required more technology than the previous one. Sea exploration depended on the invention of sailing ships. Space exploration needed the invention of spacecraft.

In particular, to explore distant space, spacecraft need enough fuel to travel long distances and a way to replace worn-out mechanical parts. John von Neumann, the Hungarian mathematician, physicist, and inventor, thought that the best way to maintain these far-travelling spacecraft was to make them _self-replicating machines_: machines that could create copies of themselves. Instead of waiting for spare parts from Earth, these machines would extract raw materials from planets and moons and manufacture replicas of themselves for further exploration.

Von Neumann shared these ideas for non-biological self-replicating systems in lectures he delivered in the late 1940s. But he found his models challenging to work with at the time. Instead, he went on to design an abstract representation of self-replicators based on _cellular automata_.

(A cellular automaton is a system of cells laid out in a two-dimensional grid. Each cell is a finite-state machine, having one of a predefined number of states at each turn. And at the next turn, each cell transitions to its next state based on the states of its surrounding cells.)

In [von Neumann's cellular automaton](https://en.wikipedia.org/wiki/Von_Neumann_cellular_automaton), each cell could be in one of 29 possible states, and its next state was determined by the states of the cells to its north, west, east, and south.

With this model, von Neumann showed that [a certain pattern of cells](https://en.wikipedia.org/wiki/Von_Neumann_universal_constructor) can make infinite copies of itself within the cellular universe. The pattern consists of two parts: the constructing machine and a line of cells that serve as a blueprint. The constructing machine reads the instructions from the blueprint one cell after the other and performs the corresponding actions, which result in an identical machine pattern.[^djd]

[^djd]: The process of constructing from a description or blueprint and the process of copying the description mirrors the processes of [DNA translation](https://en.wikipedia.org/wiki/Translation_%28biology%29) and [DNA replication](https://en.wikipedia.org/wiki/DNA_replication). Interestingly, von Neumann proposed his ideas for self-replicating automata even before the discovery of the structure of DNA molecules and the processes of translation and replication in biological cells.

{{< figure src="https://upload.wikimedia.org/wikipedia/commons/c/c4/Nobili_Pesavento_2reps.png" caption="The first implementation of von Neumann's constructor, showing three generations of the machine (the second generation has nearly finished constructing the third). The lines of cells running to the right are the machine blueprints." attr="Wikipedia" attrlink="https://upload.wikimedia.org/wikipedia/commons/c/c4/Nobili_Pesavento_2reps.png" width="450" >}}

## Life

Years after von Neumann first proposed his universal constructor, the British mathematician John Conway read about his ideas. Conway found that von Neumann's implementation could be much simpler and that it didn't need to be explicitly programmed for self-replication. As long as the automaton's rules were sufficiently complex, self-replicating patterns would emerge.

John Conway started working on a new kind of cellular automata with simpler game rules. He played around with many different rules at first. Some led to patterns that were too chaotic and died off too quickly. Others led to patterns that were too static and didn't have any interesting behaviour. Until he found rules that fell somewhere in between. He called this system the Game of Life. Or Life, for short.

Like von Neumann's automaton, the Game of Life runs on an infinite, two-dimensional grid of square cells. But unlike von Neumann's automaton, each cell can be in one of only two possible states, **live** or **dead**. And each cell interacts with its eight neighbouring cells: the cells that are horizontally, vertically, or diagonally adjacent to it. After each timestep, the cells transition following these rules:

1. Any live cell with fewer than two live neighbours dies (as if by underpopulation)
2. Any live cell with two or three live neighbours lives on to the next generation
3. Any live cell with more than three neighbours dies (as if by overpopulation)
4. Any dead cell with exactly three live neighbours becomes a live cell (as if by reproduction)

Conway's Game of Life is a "no-player" game, just like von Neumann's automaton. The initial pattern acts as the seed of the system. And each successive generation is gotten by applying the game rules to the previous generation without any new input.

{{<figure src="https://res.cloudinary.com/cwilliams/image/upload/v1634496238/Blog/Game%20of%20Life.png" caption="Four generations of the Game of Life shown, with live cells shown in black and dead cells in white. At each generation, we check for the number of neighbours each cell has. Then, we apply the game rules to find the next generation.">}}

We can implement these rules in code as:

```javascript
// Returns the next state of the cells applying the Game of Life rules
function next(grid) {
  // First, we create a new grid with the same
  // dimensions as the current grid
  const nextGrid = new Array(grid.length);
  for (let i = 0; i < grid.length; i++) {
    nextGrid[i] = new Array(grid[i].length);
  }

  // For each cell in the current grid...
  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      let c = 0;

      // For each of the cell's neighbours...
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (
            // Check that we're not looking at the cell itself...
            !(dx === 0 && dy === 0) &&
            // And that the neighbour is not outside the grid
            typeof grid[x + dx] !== 'undefined' &&
            typeof grid[x + dx][y + dy] !== 'undefined' &&
            // If the neighbour is live, increment c
            grid[x + dx][y + dy]
          ) {
            c++;
          }
        }
      }

      // If the cell is live, and it has two or three live neighbours...
      // Or the cell is dead, and it has three live neighbours, it should
      // be live in the new grid.
      // If not, the cell should be dead in the new grid.
      nextGrid[x][y] = grid[x][y] ? c === 2 || c === 3 : c === 3;
    }
  }

  return nextGrid;
}

next([
  [false, false, false],
  [true, true, true],
  [false, false, false],
]);
// Returns:
//   [[false, true, false],
//    [false, true, false],
//    [false, true, false]]
```

{{<iframefigure src="https://chidiwilliams.github.io/conway-game-of-life/?size=lg&speed=1" caption="Click on a few cells to set the initial state, then click Play." height="750px" >}}

## Life forms

Many different patterns occur in the Game of Life, and we typically classify them according to their behaviour.

_Still lifes_ are patterns that don't change from one generation to the next (as long as they are not disturbed by other patterns).

{{<iframefigure src="https://chidiwilliams.github.io/conway-game-of-life/?init=18d-,18d-,7d-2l-4d-2l-3d-,2d-2l-2d-1l-2d-1l-2d-1l-2d-1l-2d-,2d-2l-3d-2l-4d-1l-1d-1l-2d-,14d-1l-3d-,18d-,4d-2l-4d-1l-7d-,4d-1l-1d-1l-2d-1l-1d-1l-6d-,5d-1l-4d-1l-7d-,18d-,18d-,&speed=2&random=false&clear=false&reset=true" caption="L-R: A block, a bee-hive, a loaf, a boat, and a tub" height="750px" >}}

_Oscillators_ are patterns that return to their initial state after a finite number of generations. The number of generations it takes to return to the initial state is called the pattern's _period_.

{{<iframefigure src="https://chidiwilliams.github.io/conway-game-of-life/?init=19d-,19d-,9d-1l-3d-2l-4d-,2d-3l-2d-1l-2d-1l-2d-1l-5d-,7d-1l-2d-1l-5d-1l-2d-,8d-1l-6d-2l-2d-,19d-,19d-,19d-,5d-3l-3d-3l-5d-,19d-,3d-1l-4d-1l-1d-1l-4d-1l-3d-,3d-1l-4d-1l-1d-1l-4d-1l-3d-,3d-1l-4d-1l-1d-1l-4d-1l-3d-,5d-3l-3d-3l-5d-,19d-,5d-3l-3d-3l-5d-,3d-1l-4d-1l-1d-1l-4d-1l-3d-,3d-1l-4d-1l-1d-1l-4d-1l-3d-,3d-1l-4d-1l-1d-1l-4d-1l-3d-,19d-,5d-3l-3d-3l-5d-,19d-,19d-,19d-,19d-,19d-,19d-,19d-,19d-,19d-,19d-,&speed=2&random=false&clear=false&reset=true" caption="Top, L-R: A blinker (period 2), a toad (period 2), and a beacon (period 2). Bottom: A pulsar (period 3)." height="750px" >}}

_Spaceships_ can move across the board.

{{<iframefigure src="https://chidiwilliams.github.io/conway-game-of-life/?init=35d-,35d-,3d-4l-28d-,2d-1l-3d-1l-28d-,6d-1l-28d-,2d-1l-2d-1l-29d-,35d-,35d-,35d-,4d-1l-24d-1l-5d-,5d-1l-22d-1l-6d-,3d-3l-22d-3l-4d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,35d-,&speed=2&random=false&clear=false&reset=true" caption="Top: A light-weight spaceship. Bottom: Two gliders collide." height="750px" >}}

_Methuselahs_, like the R-pentomino, evolve for many generations before stabilizing.

{{<iframefigure src="https://chidiwilliams.github.io/conway-game-of-life/?init=116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,55d-2l-59d-,54d-2l-60d-,55d-1l-60d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,116d-,&speed=50&random=false&clear=false&reset=true" caption="L-R: The R-pentomino takes 1103 generations to stabilize" height="750px" >}}

There are more complex patterns, like stationary guns that produce gliders and other spaceships; puffer trains that move along, leaving behind a trail of debris; and rakes that move and emit spaceships.

{{<iframefigure src="https://chidiwilliams.github.io/conway-game-of-life/?init=90d-,26d-1l-63d-,24d-1l-1d-1l-63d-,14d-2l-6d-2l-12d-2l-52d-,13d-1l-3d-1l-4d-2l-12d-2l-52d-,2d-2l-8d-1l-5d-1l-3d-2l-66d-,2d-2l-8d-1l-3d-1l-1d-2l-4d-1l-1d-1l-63d-,12d-1l-5d-1l-7d-1l-63d-,13d-1l-3d-1l-72d-,14d-2l-74d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,90d-,&speed=50&random=false&clear=false&reset=true" caption="L-R: A Gosper glider gun emitting gliders" height="750px" >}}

And it gets even more interesting. We can use glider guns as digital signal generators, construct [logic gates](https://youtu.be/vGWGeund3eA) (like AND, OR, and NOT gates) and memory blocks based on the interactions of gliders, and combine these logic gates and memory blocks to create patterns that can perform computations. In fact, the Game of Life is Turing-complete. In theory, it can simulate any computation that a typical computer can perform—including [simulating itself](https://youtu.be/xP5-iIeKXE8)!

Remember John von Neumann's vision of machines that can replicate themselves? Different patterns in Life have been developed that make copies of themselves. One, called [Gemini](https://youtu.be/A8B5MbHPlH0), creates a copy of itself while destroying its parent. Another, the [linear propagator](https://www.conwaylife.com/wiki/Linear_propagator), which has a bounding box with 15 million cells on each side, creates a complete copy of itself in 237 million generations while retaining its parent.

On the surface, the Game of Life is an interesting mathematical game and a fun programming exercise. But Life illustrates something even deeper. Against our intuitions that complex things must arise out of even more complex things, it shows how complexity and organization can emerge from simplicity. Life, as it turns out, is more than just a game.

---

Check out the [online demo](https://chidiwilliams.github.io/conway-game-of-life) for Conway's Game of Life and the [source code on GitHub](https://github.com/chidiwilliams/conway-game-of-life).

## Notes
