---
title: Conway's Game of Life
date: 2021-10-05T16:23:28+01:00
draft: true
---

As long as humans have been around, we have always wanted to explore. Prehistoric humans may have peeked in curiously at the entrance of caves, wandered into unknown wildernesses, or ^^...^^. Then, we built sailing ships setting out on voyages to seek out distant lands. And now, we build space probes to investigate moons and planets billions of kilometres away.

As we've explored farther, we've needed more and more technology and resources. Colonizing outer space requires machines that need lots of fuel and other resources, and they go through wear and tear. ^^Need food to take humans, need part replacements...^^

The Hungarian mathematician, physicist, and inventor, John von Neumann thought that the solution to this problem was to build machines that could create copies of themselves: self-replicating machines.

These self-replicating machines, later eponymously termed "von Neumann probes", would extract raw materials from planets and moons for space exploration and large-scale mining operations, and also create replicas of themselves.

Von Neumann shared these ideas for non-biological self-replicating systems in lectures he delivered in the late 1940s. But he found the models difficult to analyze mathematically; the ideas were far ahead of the technology of the time. These days, we have 3D printers capable of creating many of their own parts, but the idea of self-replicating machines wasn't very common at the time.

Instead, he went on to design an abstract model of self-replicators based on cellular automata. Cellular automata is a system of cells laid out in a two-dimensional grid. Each cell is a finite-state machine, having one of a predefined number of states at each turn. At the next timestep, each cell transitions to its next state based on the states of its surrounding cells, according to a predefined set of rules. In [von Neumann's cellular automata](https://en.wikipedia.org/wiki/Von_Neumann_cellular_automaton), each cell could be in one of 29 possible states. And the next state was determined by the states of the cells north, west, east, and south of each cell.

> ^^Simple demo maybe of vN's automata; but might be easier to explain when we get to Conway, but easy to lose reader here^^

With this model, von Neumann showed that there is a certain pattern of cell states, called the [von Neumann universal constructor](https://en.wikipedia.org/wiki/Von_Neumann_universal_constructor), which could make infinite copies of itself within the cellular universe.

The constructor was made up of two parts: the constructing machine and a line of cells that serve as the blueprint of the machine. The machine reads the instructions from the blueprint one cell after the other, and performs the corresponding actions. The actions direct the machine to build what turns out to be an identical machine, after which the machine makes a copy of the blueprint for the child machine to use.[^djd]

## Life

Years later, von Neumann's creation of the universal constructor, the British mathematician, John Conway read about von Neumann's ideas for self-replicating cellular automata in a book called **Automata Studies**. Conway thought that von Neumann's implementation was more complex than it had to be. Also, von Neumann had explicitly made the rules of the game in such a way as to facilitate making a machine that could read its own instructions to create a copy of itself. Conway thought that as long as the game rules were sufficiently complex, self-replicating patterns would emerge.

And so John Conway started working on creating a new kind of cellular automata with simpler rules. Conway played around with different rules: some led to patterns that were too chaotic and died off too quickly, and others led to patterns that were too static and didn't have any interesting behaviour. Till he settled on a set of rules that were somewhere in between. He called this system the Game of Life, or Life for short.

Like von Neumann's automata, the Game of Life runs on an infinite, two-dimensional grid of square cells. But unlike von Neumann's automata, each cell can be in one of only two possible states, **live** or **dead**. Each cell interacts with its eight neighbouring cells: the cells that are horizontally, vertically, or diagonally adjacent to it.

After each timestep, the cells transition following these rules:

1. Any live cell with fewer than two live neighbours dies (as if by underpopulation)
2. Any live cell with two or three live neighbours lives on to the next generation
3. Any live cell with more than three neighbours dies (as if by overpopulation)
4. Any dead cell with exactly three live neighbours becomes a live cell (as if by overpopulation)

The Game of Life is a no-player game. The initial pattern acts as the seed of the system. And each successive generation is a **pure function** of the previous generation, gotten by applying the game rules without any further outside input.

> ^^Diagram showing application of rules^^

```javascript
function next(grid) {
  // First, we create a new grid with the same
  // dimensions as the current grid
  const nextGrid = new Array(grid.length);
  for (let i = 0; i < grid.length; i++) {
    nextGrid[i] = new Array(grid[i].length);
  }

  // For each cell in the existing grid...
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
```

> ^^Add demo for the game. Ask reader to play around with adding random initial states and seeing it play out.^^

## Life forms

Many different types of patterns occur in the Game of Life, and they are commonly classified according to their behaviour.

**Still lifes** are patterns that don't change from one generation to the next (as long as they're not disturbed by other patterns).

> ^^Demo of still lifes: blocks, bee-hives, loafs, boats, tubs^^

**Oscillators** are patterns that return to their initial state after a finite number of generations. The number of generations it takes to return to the initial state is called the pattern's **period**.

> ^^Demo of oscillators: blinkers, toads, beacons, pulsars, penta-decathlons^^

**Spaceships** can move in some direction across the board.

> ^^Demo of spaceships: gliders, light-weight, middle-weight, heavy-weight spaceships^^

**Methuselahs** evolve for many generations before stabilizing. The **R-pentomino** takes 1103 generations to stabilize. **Diehard**, on the other hand, eventually disappears after 130 generations.

> ^^Demo of Methuselahs; might be too complex/large to demo?^^

There are more complex patterns, like stationary guns that produce gliders and other spaceships, puffer trains that move along leaving behind a trail of debris, and rakes that move and emit spaceships.

> ^^Demo of guns, trains, rakes; might be even more complex to demo, idk^^

And it gets even more interesting. If two gliders are shot at a block placed in a specific position, the block moves closer to the gliders. If three gliders are shot at a block in a specific position, the block moves farther away from the gliders. This sliding block movement can be used to simulate a counter.

> ^^Demo maybe? For demos that are too complex, leave links to articles/YT videos.^^

We can also construct logic gates, like AND, OR, and NOT gates, based on the movements and interactions between gliders ^^link?^^. John Conway showed that we can combine counter memory and logic gates to build a pattern that can create patterns by reading other patterns as input, essentially acting like a universal Turing machine.

Remember von Neumann's vision of machines that can replicate themselves? Different patterns in Life have been developed that make copies of themselves. One, called Gemini, creates a copy of itself while destroying its parent. Another, the linear propagator, creates a complete copy of itself, retaining the parent.[^rbk]

The Game of Life is an interesting game and programming exercise. But it's a little more than that. It illustrates how complex patterns can arise from a simple set of rules. ^^emergence theory^^ ^^without explicit, upfront design.^^ ^^goes against our intuitions about complexity.^^ ^^[Sierpinski Hexagon](https://chidiwilliams.github.io/sierpinski-hexagon/)^^. Life, as it turns out, is more than just a game.

## Notes

[^djd]: The process of constructing from a description or blueprint and the process of copying the description mirrors the processes of [DNA translation](https://en.wikipedia.org/wiki/Translation_%28biology%29) and [DNA replication](https://en.wikipedia.org/wiki/DNA_replication). Interestingly, von Neumann proposed his self-replicating automata ideas even before the discovery of the structure of DNA molecules and the process of translation and replication in biological cells.
[^rbk]: These patterns are far too large to show here. The linear propagator has a bounding box with 15 million cells on each side and replicates in 237 million generations. But you can watch a video of Gemini [on YouTube](https://youtu.be/A8B5MbHPlH0?t=76).
