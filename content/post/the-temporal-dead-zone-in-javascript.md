---
title: 'The Temporal Dead Zone in JavaScript'
date: 2022-02-18T12:19:08Z
draft: false
thumbnail: 'https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_500/v1645259971/Blog/pexels-brett-sayles-1662770.webp'
images:
  [
    https://res.cloudinary.com/cwilliams/image/upload/v1645259971/Blog/pexels-brett-sayles-1662770.webp,
  ]
---

JavaScript is somewhat popular within the programming community for its many quirks. There are countless blog posts, conference talks, and books that discuss how seemingly harmless JavaScript programs can sometimes behave unexpectedly.

Many of these talks and books try to steer learners away from the confusing features of the language and towards "The Good Parts". But in the [_You Don't Know JS_](https://github.com/getify/You-Dont-Know-JS#you-dont-know-js-yet-book-series---2nd-edition) (YDKJS) book series, Kyle Simpson tries to do the exact opposite: instead of skirting around the dark corners of JavaScript, the book "goes deep into the core mechanisms of the language to explain why it works the way it does".

I had a YDKJS moment recently. While implementing scoped variables for [my Lox interpreter](https://chidiwilliams.com/post/notes-on-crafting-interpreters-go/), I stumbled onto a small JavaScript program that seemed confusing at first. But after studying it more closely, I found that it uncovered some of the depth and nuance with JavaScript's design and helped me understand the language even better.

## Variables in scope

The "Resolving and Binding" chapter of _Crafting Interpreters_ discusses how to resolve variables according to their scopes. Lox, the language implemented in the book, supports global and block-scoped variables (both declared with `var` statements) as well as closures.

Here's a short Lox program from the book:

```text
var a = "global";
{
    function showA() { print a; }
    showA();
    var a = "local";
    showA();
}
```

`showA` "captures" the value of the globally-defined variable `a`, and the scope of the second declaration is limited to the block. So, the program prints "global" twice.

When I first came across this program, I thought its behaviour seemed consistent with how I understood other languages worked. For example, we may rewrite in Go as:

```go
var a = "global"

{
  var showA = func() {
    fmt.Println(a)
  }

  showA()
  var a = "block"
  showA()
}
```

And it also prints "global" twice.[^ghe]

[^ghe]: Well, not exactly. The program as-is fails to compile because the second "a" variable is unused. You might add `_ = a` to the end of the block to mute the error, but I left it out so as not to give away the point of the example prematurely.

We can also write a similar program in JavaScript:

```js
var a = 'global';
{
  function showA() {
    console.log(a);
  }
  showA();
  var a = 'local';
  showA();
}
```

If you're familiar with variable scope and hoisting in JavaScript, you might be able to tell that this program isn't quite the same as the previous two. `var` statements in JavaScript declare hoisted, globally-scoped (or function-scoped) variables. So, both variable declarations are hoisted to the top of the program and point to the same variable. The program is equivalent to:

```js
var a; // hoisted first declaration / a has a value of undefined at this point
var a; // hoisted second declaration / has no effect on the variable, a is still undefined

a = 'global'; // a assigned to 'global'
{
  function showA() {
    console.log(a);
  }
  showA();
  a = 'local'; // a re-assigned to 'local'
  showA();
}
```

The second declaration of `a` overwrites the first, and the program prints "global" and then "local".

That works out fine. We used two global variables, so it's not quite the same as the original program. Now, we only need to change the second declaration to a block-scoped variable to revert to the original program.

```js
var a = 'global';
{
  function showA() {
    console.log(a);
  }
  showA();
  let a = 'local';
  showA();
}
```

And it prints...

```text
Uncaught ReferenceError: Cannot access 'a' before initialization
    at showA (<anonymous>:3:36)
    at <anonymous>:4:5
```

That doesn't seem right at all. Why doesn't it print "global" twice like the Lox and Go programs? Why does it throw an error instead? Why can't it "access 'a' before initialization"?

## The Temporal Dead Zone

Unlike variables declared with `var`, which have global or function scope, variables declared with `let` (and `const`) are scoped to their containing block. But like `var`, they are also hoisted to the top of their scope.

So, the previous program is the same as:

```js
var a; // hoisted var declaration / a is undefined
a = 'global'; // a is "global"
{
  let a; // hoisted let declaration / what is a??
  function showA() {
    console.log(a);
  }
  showA();
  a = 'local'; // a is "local"
  showA();
}
```

The `let` declaration is hoisted to the top of the block. So the first call to `showA()` prints the value of `a` after it is hoisted but before it is initialized. The variable has no value yet. And trying to access it throws a `ReferenceError`.

We call this _period_ after entering the scope of a variable but before its initialization the Temporal Dead Zone (TDZ).

```js
var a = 'global';
{
  // a is hoisted to the top of the
  // block scope, but not yet initialized
  // <Start of TDZ for a>
  let a;
  function showA() {
    console.log(a);
  }
  showA(); // ReferenceError
  a = 'local'; // <End of TDZ for a>
  showA();
}
```

Trying to access a variable within its TDZ throws a `ReferenceError`. The variable during that window is..._dead_.

As the name suggests, the TDZ is a _temporal_ window, not a _spatial_ one. The zone describes a duration of execution time and not position in code. In the example below, calling `greet()` throws a `ReferenceError` while trying to access the value of `greeting`.

```js
// <Start of TDZ for greeting>
greet(); // ReferenceError

let greeting = 'hello'; // <End of TDZ for greeting>

function greet() {
  console.log(greeting);
}
```

The `console.log` statement is after the variable declaration based on its position in code. But temporally, the function tries to access the variable before it is initialized.

## Why TDZ?

That explains why we got the `ReferenceError` in the program earlier. But why _does_ it work that way? Why don't `let` variables get auto-initialized to `undefined` like their `var` counterparts?

```js
greet(); // prints undefined

var greeting = 'hello';

function greet() {
  console.log(greet);
}
```

Well, it [comes from `const`](https://github.com/getify/You-Dont-Know-JS/blob/2nd-ed/scope-closures/apA.md#where-it-all-started). While developing ES6, the JavaScript standardization committee (TC39) chose to make `const` and `let` declarations hoist to the top of their (block) scope to be consistent with `var` declarations. But what value would a `const` variable have before its initialization?

```js
{
  console.log(greeting); // greeting is hoisted, but what value does it have?

  // ...

  const greeting = 'hello';

  // ...
}
```

If we had declared this variable with a `var` statement, it would have been auto-initialized with `undefined`. Why don't we do the same with `const`? If we do, the variable gets a value of `undefined` for the first half of the block. Then after the `const` statement, it becomes `"hello"` for the rest of the block. Then, because the variable is a `const`, it wouldn't be re-assignable after that point.

Two different values? `undefined` and then `"hello"`? That's one too many values for a _constant_.

We seem to be at an impasse here: the `const` variable has to exist throughout the scope, but we can't auto-initialize it to `undefined`. What do we do when the variable exists but hasn't yet been assigned?

We say it's in a "dead zone". As we saw earlier, trying to access the variable in this zone is illegal and throws a `ReferenceError`. And to be consistent with `const`, the TC39 chose to have a TDZ for `let` as well.

There are a few other scenarios to watch out for with "dead zone" variables, like when inside loop blocks and when combining `var`s and `let`s. But to avoid many of these issues, the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz) recommend declaring `let` (and `const`) variables at the top of the scope in which they are used.
