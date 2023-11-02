---
title: 'Crafting Interpreters: A Review'
date: 2022-06-21T13:08:51+01:00
draft: false
categories: languages
images:
  [
    'https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_800/v1655822011/Blog/crafting-interpreters.webp',
  ]
favorite: true
---

<figure>
  <img src="https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_800/v1655822011/Blog/crafting-interpreters.webp" alt="Picture of Crafting Interpreters" width="800" height="533">
	<figcaption>
    <p>
      Source: <a href="https://journal.stuffwithstuff.com/2021/07/29/640-pages-in-15-months/" target="_blank" rel="noreferer noopener">Bob Nystrom</a>
    </p>
  </figcaption>
</figure>

Certain areas within the field of computer science seem to me to be almost comparable to wizardry. I've spent most of my time as a software engineer working on high-level web applications, so large, complex, lower-level software like compilers, databases, operating systems, and browsers often appear daunting. While I use them regularly, I often feel I don't appreciate or understand them well enough.

But over the past few months, reading Bob Nystrom's book _[Crafting Interpreters](https://craftinginterpreters.com/)_ helped me learn about some of the inner workings of interpreters and compilers.[^sld] _Crafting Interpreters_ discusses how to implement an interpreter for a programming language, Lox. Lox is dynamically typed, has a C-like syntax, and supports functions and classes. Overall, it looks and feels a lot like JavaScript.

[^sld]: I wrote a few other posts related to topics I learned while reading the book. See: [Notes on Crafting Interpreters: Go](https://chidiwilliams.com/post/notes-on-crafting-interpreters-go/), [Ambiguous Grammars](https://chidiwilliams.com/post/ambiguous-grammars/), [The Temporal Dead Zone in JavaScript](https://chidiwilliams.com/post/the-temporal-dead-zone-in-javascript/), [How to Write a Lisp Interpreter in JavaScript](https://chidiwilliams.com/post/how-to-write-a-lisp-interpreter-in-javascript/), and [On Recursive Descent and Pratt Parsing](https://chidiwilliams.com/post/on-recursive-descent-and-pratt-parsing/).

The first section of the book implements a [tree-walk interpreter](<https://en.wikipedia.org/wiki/Interpreter_(computing)#Abstract_syntax_tree_interpreters>) in Java: A scanner converts the source code (read from REPL input or a file) into a list of tokens. A parser parses the list of tokens into an Abstract Syntax Tree (AST), where each node in the tree represents a syntactic unit of the program. And then, an interpreter traverses the tree and executes each node to run the program.

While implementing the tree-walk interpreter, the book introduces different concepts behind programming languages and interpreters. For example, the section on parsing discusses the [formal grammar](https://en.wikipedia.org/wiki/Formal_grammar) of Lox, the set of rules that specify how to produce valid Lox programs. Also, the parser uses a technique called [recursive descent parsing](https://en.wikipedia.org/wiki/Recursive_descent_parser): it defines a set of functions where each one implements one of the production rules in the formal grammar. Starting from the top of the grammar, the rule that specifies a "program", the functions recursively parse statements and expressions down to the smallest "atoms" (like numbers, strings, and booleans).

The interpreter keeps track of its "environment" in a map containing names and the respective variables, functions, and classes. Each "scope" (like a block or a function) maintains its environment map and a reference to the enclosing scope's environment. So, to look up a variable, the interpreter walks through the "linked list" from the current environment to the top-most (global) environment.

At the end of the tree-walk interpreter section, there's a complete, working Lox interpreter that can read and interpret Lox programs. But the book takes it even further. The following section covers the implementation of a more optimized interpreter: a bytecode Virtual Machine (VM) written in C. To avoid the overhead of traversing an AST, the VM represents a Lox program as a set of instructions in a byte array: the VM's compiler parses the source program into a sequence of instructions, and the VM iterates through the instructions and executes each one in turn.[^lao]

[^lao]: The term "virtual machine" comes from the fact that this process emulates how CPUs work.

Besides the bytecode representation, the VM implements a few other optimizations. For one, it [interns](https://en.wikipedia.org/wiki/String_interning) all strings in the source program (like the names of variables, functions, and classes; and strings created at runtime). It stores only one copy of each distinct string value, and subsequent occurrences of the string point to the same unique copy, making it more efficient to compare strings.

The VM holds the values of global variables in a hash map. But unlike the tree-walk interpreter, it stores local variables on a stack. This optimization makes the VM's compiler more complex, because it needs to know where to keep and find each local variable on the stack. But it improves the performance of assigning and accessing local variables. (Speaking of hash maps, since C does not provide a built-in hash map, the VM implements its own.)

Lox is a managed language, meaning the language implementation allocates and frees memory for the user. So, a later chapter in the VM section covers the implementation of a [mark-and-sweep garbage collector](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Na%C3%AFve_mark-and-sweep) (GC). It's surprisingly straightforward: The GC first "marks" all the objects that the program can still access; these are the "roots" (global variables and objects currently on the VM stack) as well as objects that the roots hold references to. Then in the "sweep" stage, the GC frees all unmarked objects; for example, objects that have gone out of scope without getting captured by a closure.

The final chapter of the VM section covers two further optimizations. The first one uses [bit masking to perform modulo operations](<https://en.wikipedia.org/wiki/Mask_(computing)#Hash_tables>), which speeds up the VM's hash table. And the second, NaN boxing, changes the representation of Lox values (booleans, numbers, strings, functions, classes, and instances) from a C union struct to a `uint64_t` number so that the VM can pack more values into the same amount of memory.

These optimizations get the VM running a _lot_ faster than the tree-walk interpreter. In [one benchmark](https://gist.github.com/chidiwilliams/910e887fdbc9ec9a601493a9274572a2), it runs more than 40 times faster than a [Go implementation](https://github.com/chidiwilliams/glox) of the tree-walk interpreter.

At over 600 pages long, _Crafting Interpreters_ isn't a quick Sunday afternoon read. It took me almost six months—an hour or so a day for a few days a week—to complete the book and implement both interpreters. And I found the book light on theory, focusing more on the practical implementation of interpreters than on academic programming language theory.

Yet, the time was well worth it. Many programming books tend to be tedious and challenging to read, but I found the writing in _Crafting Interpreters_ simple, engaging, and even sometimes amusing.

I also enjoyed the design notes and challenges at the end of each chapter. The notes featured discussions about the design of Lox and languages in general, like: How much novelty should you put into a new language? And how much should you stick to existing conventions? How should you choose variable scoping rules? What kinds of tests and benchmarks should you write for your language? And the challenges prompted me to extend the core language further by adding more features (like ternary expressions, anonymous functions, and getter methods), improving the compiler errors, and adding more optimizations.

The book itself is also beautiful; many pages have delightful illustrations that help the reader visualize complicated concepts. And it was fascinating to learn that the author [hand-drew _every_ line and letter](https://www.youtube.com/watch?v=iN1MsCXkPSA) in the illustrations. In a "behind-the-scenes" [blog post](https://journal.stuffwithstuff.com/2020/04/05/crafting-crafting-interpreters/), Bob Nystrom also writes about the bespoke build system he made for the book. The script collects all the snippets in each chapter, builds per-chapter versions of the interpreters, and then runs all the tests expected to pass by that point in the book! It's a work of technical-writing art.

I thought _Crafting Interpreters_ was brilliant and one of the best technical books I've ever read. Without hesitation, I'd recommend it to anyone interested in learning about languages and interpreters. In the end, I can't help but continue to admit the wizardry of the author's work. Presenting such a seemingly daunting topic simply and yet beautifully is magical, after all.
