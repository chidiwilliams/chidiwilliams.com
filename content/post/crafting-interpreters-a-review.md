---
title: "Crafting Interpreters: A Review"
date: 2022-06-19T13:08:51+01:00
draft: true
categories: languages
---

![](https://journal.stuffwithstuff.com/image/2021/07/book.jpg)

Certain areas within the field of computer science seem to me to be almost comparable to wizardry. I've spent most of my time as a software engineer working on high-level web applications, and so large, complex, lower-level software like compilers, databases, operating systems, and browsers often appear daunting; while I use them regularly, I often feel I don't appreciate them well enough or even understand them at all.

Over the past few months, Bob Nystrom's book *Crafting Interpreters* helped 

Over the last six months, Bob Nystrom's book *Crafting Interpreters* helped me see a little of what's behind the curtain of the field of languages, to learn some of the key ideas behind programming languages and their interpreters. I've written a number of blog posts on things I learned from the book.[^sld]

[^sld]: See: [Notes on Crafting Interpreters: Go](https://chidiwilliams.com/post/notes-on-crafting-interpreters-go/), [Ambiguous Grammars](https://chidiwilliams.com/post/ambiguous-grammars/), [The Temporal Dead Zone in JavaScript](https://chidiwilliams.com/post/the-temporal-dead-zone-in-javascript/), [How to Write a Lisp Interpreter in JavaScript](https://chidiwilliams.com/post/how-to-write-a-lisp-interpreter-in-javascript/), [On Recursive Descent and Pratt Parsing](https://chidiwilliams.com/post/on-recursive-descent-and-pratt-parsing/)

*Crafting Interpreters* discusses how to make an interpreter for a programming language called Lox. Lox is dynamically typed, has a C-like syntax, `var` keyword for declaring variables, and classes and inheritance. It looks a little like JavaScript, except that it uses `var` for both global and local variables, and Lox classes aren't prototypes.

The first section of the book implements a tree-walk interpreter, written in Java. The tree-walk interpreter consists of three main components: a `Scanner` class that converts the source code (read from REPL input or from a file) into a list of tokens; a `Parser` class that converts the list of tokens into an Abstract Syntax Tree, where each node in the tree represents a syntactic unit of the program; and an `Interpreter` class that walks through the tree and executes each node to run the program. Errors in the scanner and parser are reported as compile errors, while the interpreter reports runtime errors.

While implementing the tree-walk interpreter, the book introduces different concepts relevant to how programming languages and interpreters in general. The parser implements the **formal grammar** of Lox, which specifies how a language should be parsed. The grammar is a set of production rules that specifies how a language should be parsed.

The chapters also discuss how to store state in runtime. The interpreter maintains an internal map of names to variables used to store the values of variables, functions, and classes. To implement **lexical scoping**, i.e. to support how variables can be looked up up the scope, the environment is also a linked list with each environment instance pointing to the one representing the enclosing scope. Environment chain.

The parser itself uses **recursive descent parsing**, a technique that works by walking down the list of production rules in the formal grammar and parsing each stage recursively. It's a simple way to write a hand-written parser, and is also commonly used in industry: GCC, V8 (the JavaScript VM in Chrome), Roslyn (a C# compiler) amd other production language implementations all use it. It's a top-down parsing technique that starts from the top grammar rule, literal translation of the grammar's rules to imperative code. It's described as "recursive" because when a grammar rule refers to itself, like an expression contains sub-expressions, that translates to a recursive function call.

At this point, halfway through the book, there's a working interpreter. It can read and interpret any Lox program. But the book takes it even further to implement a more performant interpreter. The next section covers the implementation of a bytecode Virtual Machine (VM). Instead of converting the program to a tree structure like in the previous implementation, the VM represents Lox programs as a set of instructions in an array of bytes. The VM compiler translates the program to this sequence of instructions in a single pass. Then the core of the VM runs through the list of bytes and executes each instruction in turn. It's called a virtual machine because executing instructions is just what a processor does, and the VM emulates that.

The VM implementation is written in C, vs the Java of the tree-walk interpreter. The VM implementation consists of a scanner that converts the source program to tokens; a compiler that converts tokens into bytecode instructions, and the core VM that executes the instructions.

The VM also implements [string interning](https://en.wikipedia.org/wiki/String_interning#:~:text=In%20computer%20science%2C%20string%20interning,string%20is%20created%20or%20interned.). Strings in the source program, such as the names of variables, functions, and classes, and runtime string values as well are stored only one copy of each distinct string value. This optimization makes it more efficient to compare strings, like when comparing variable names. Each compile-time constant string is stored in a hash map, and each subsequent occurence of the string is represented with the same unique copy.

Speaking of hashmaps, the VM also implements its own hashmap backed by a C array.

The VM holds a hashmap to store the values of global variables declared in the program; but inlike the tree-walk implementation, local variables are stored on a stack in the VM, which optimizes the performance of accessing the values of local variables (index lookup in the stack vs hashmap lookup). The stack also holds intermediate values in expressions.

The VM parser uses a technique called Pratt parsing instead of recursive descent to parse expressions.[^dls]

[^dls]: Post on Pratt parsing compares both of them. 

Given these foundations, the VM implements all the remaining features of the Lox language: functions (a self-contained list of bytecode instructions, with the arguments stored in defined positions in the stack), closures (a function that traps variables defined in enclosing scope using upvalues), and classes (a value with a hashmap holding the methods).

A later chapter in the VM section discusses the implementation of a mark-and-sweep garbage collector. Lox is a managed language, meaning users of the language don't expect to allocate and free memory by themselves. The chapter explores how to implement a GC. The implementation is rather straight-forward: Garbage is collected when a new Lox object is allocated. The GC first "marks" all objects that the program can still access, i.e. objects still on the VM stack, global variables, as well as objects that those "roots" can access. Then in the "sweep" stage, the GC frees all objects that were not marked (like objects created in a local scope that has passed).

The final section of the VM section then describes a few techniques for optimizing the VM even further. The first is a way to perform modulo using bit masking, which improved the performance of the Lox interpreter by 100% in one benchmark. And the final optimization uses a technique called NaN boxing. Lox values (booleans, numbers, and objects like strings, class instances, and functions) are represented in a C struct., but the NaN boxing changes the representation to inside a number. So the VM is able to pack more values into the same amount of memory.

These optimizations get the VM running a lot faster than the tree-walk implementation. The author wrote some benchmarks were clox is almost n times as fast as jlox. I found that clox was n times as fast as my own implementation of the tree-walk interpreter in Go.

I don't have much to offer by way of criticisms of the book, but it would be helpful for readers to know that firstly it's quite a large book. At 600+ pages, it's going to take a while to complete. At an average of around an hour or so a day for a few days a week, it took me almost six months to read the book and implement both interpreters.

Also, while the book is comprehensive in its explanations, it's light on the theory. It focuses more on the practical implementation of the interpreters. The author recommends the cult-classic Dragon book and others for deeper dives into the theory behind compilers and interpreters.

But I think the time spent on it was well worth it. The book was written in a simple and easy to understand way. The language was simple and easy to understand. I never needed to Google too much to understand what he meant. Many technical books tend to be drab and boring, but *Crafting Interpreters* is humorous and fun to read. It's a work of technical writing art. Was a light read, written honestly to teach you something, and sometimes humorous.

The illustrations were also very beautiful. Lots of hand-drawn diagrams littered around the pages of the book that had some character to them. Really enjoyed them for visualizing different topics across the book. I found it rather fascinating that the author made every one of them.

The book also featured a lot of design notes that covered topics related to the implementation of the interpreters. The design notes covered topics that let you think about why we did things in certain ways, more philosophical decisions about the language: How much should you stay true to your language's logic, ignoring programming language history? Do you start from a blank slate and first principles or let your users start from something they are already familiar with? How do you strike the right balance when it comes to adding syntactic sugar to your language? How do you approach writing tests and benchmarks for your language? How much novelty should you add to your language. While others were discussions on some technical details like variable scoping and garbage collection. These design notes were some of my favourite sections of the book as they helped to get me think outside the box of the main implementation of the interpreters and about the philosophy behind languages itself, and helped me appreciate some of the thinking that goes into making a good language.

Each section also featured challenges which you do outside the core language itself. One challenge was on adding ternary expressions to the language, another was on . Some were to test your knowledge of the preceding section, others were to do further research to see how other languages tackle some of the decisions made in the language implementation, while yet others were to add additional features, like ternary, anonymous functions, additional compiler errors, optimizations (especially in the VM section). A tiny thing I noticed about the challenges were that they weren't repetitive between the section, even though the two interpreter sections sometimes talked about different things. This kept the book more interesting to read.

Also liked the emphasis of debuggability. For something like a VM working with raw bytes, I could clearly see how debugging what instruction is being executed, what the current state of the stack is, what the GC is doing would be very difficult without the debugging helpers.

Also enjoyed reading about the process of making the book.

https://journal.stuffwithstuff.com/2020/04/05/crafting-crafting-interpreters/ In this blog post, he talks about how he got into making languages by making toy languages, as well as how he made a bespoke build system to build the Java tree-walk interpreter and the C bytecode VM. The build system includes a test runner that verifies that the code at each point in the book did exactly as expected. If that wasn't crazy enough, he talks about the process of making all the illustrations in the book...by hand! Every single line and letter in all the illustrations in the book were hand drawn. Not just a great piece of writing, but a beautiful work of art. And writing every day for six years. Not just Crafting Interpreters, but crafting the book itself. 240k words. https://www.youtube.com/watch?v=iN1MsCXkPSA

Overall, I thought it was a brilliant book, one of the best technical books I ever read and worth the time spent on it. Without a doubt, I'd recommend for any one who has some experience programming and wants to learn about languages and interpreters. Thought it was magical how well he explained it. Overall, I think *Crafting Interpreters* is unable to convince us of the wizardry of its author; being able to present such a seemingly complex topic simply and yet beautifully is magical after all.
