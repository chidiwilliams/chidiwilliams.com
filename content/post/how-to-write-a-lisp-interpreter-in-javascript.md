---
title: How to Write a Lisp Interpreter in JavaScript
date: 2022-04-03T12:00:00+00:00
draft: false
categories: [languages]
---

In a previous [essay](https://chidiwilliams.com/post/evaluator/) [series](https://chidiwilliams.com/post/evaluator-2/), we saw how to write an expression evaluator with support for arithmetic and logical operators; variables; and functions like `IF`, `MIN`, and `MAX`. In this essay, we'll implement a similar but slightly more advanced program: an interpreter for a dialect of Lisp called [Scheme](<https://en.wikipedia.org/wiki/Scheme_(programming_language)>).[^ldn]

[^ldn]: This essay is largely inspired by Peter Norvig's [(How to Write a (Lisp) Interpreter (in Python))](https://norvig.com/lispy.html).

We'll start with a brief discussion on Scheme's syntax and the general architecture of the interpreter. Then in the subsequent sections, we'll implement number, boolean, string, and list data types; primitive procedures; conditional expressions; variables; and lambdas.

By the end of this essay, hopefully, you'll have gained a better understanding of some of the basic concepts behind languages and interpreters.

## A quick introduction to Scheme

Scheme is a minimalist dialect of Lisp, a family of languages based on a nested-list syntax called the symbolic expression (or _s-expression_).

An expression can either be an _atom_: a number (e.g. `8`), a string (e.g. `"welcome"`), a symbol (e.g. `count`); or a _list expression_: a "(", followed by zero or more expressions, followed by a ")". A list expression starting with a keyword (e.g. `(if ...)` or `(define ...)`) is a _special form_, while one starting with a non-keyword is a function call (e.g. `(fn ...)`).

All Scheme programs consist entirely of these expressions; unlike languages like Java, C, and Python, Scheme makes no distinction between statements and expressions.

```scheme
10 ; 10
(+ 137 349) ; 486
(define factorial
  (lambda (n)
    (if (<= n 1) 1 (* n (factorial (- n 1))))))
(factorial 10) ; 3628800
```

## General architecture of the interpreter

A Scheme interpreter accepts the source code of a Scheme program, evaluates the expressions in the program, and returns the final result.

We may split the interpreter into three components: a scanner, a parser, and an interpreter.

> **Scanner → Parser → Interpreter**

The _scanner_ walks through the source code of the program and extracts the meaningful "units", or _tokens_, of the program into a list. It discards unneeded whitespace characters and also reports errors when it finds unknown characters.

```js
scan(`(define odd?
  (lambda (x)
    (= 1 (remainder x 2))))`);
// ["(", "define", "odd?", "(", "lambda", "(", ...]
```

The _parser_ then transforms the list of tokens into an Abstract Syntax Tree (AST) that represents the syntactic structure of the program.

Each node in the AST describes some syntactic component in the program. A `LiteralExpr` node holds a literal value, like a number or a string; a `CallExpr` node represents a function call; a `LambdaExpr` node describes a lambda expression, and so on.

![Abstract Syntax Tree representation of a Scheme expression](https://res.cloudinary.com/cwilliams/image/upload/v1648988896/Blog/lisp-interpreter-ast.drawio.png)

Finally, the _interpreter_ evaluates the AST. It walks from the top of the tree to the bottom, executes each node recursively, performs any needed side-effects (like defining or modifying variables), and returns the final result.

We may define a `run` function to perform all three steps of the evaluation:

```js
const interpreter = new Interpreter();

function run(source) {
  const scanner = new Scanner(source);
  const tokens = scanner.scan();

  const parser = new Parser(tokens);
  const expressions = parser.parse();

  return interpreter.interpretAll(expressions);
}
```

## Lisp calculator

We'll begin by implementing the interpreter as a simple "calculator". Like a regular calculator, it can perform basic arithmetic operations on numbers; but it will also support boolean, string, and list operations. When this version of the interpreter is complete, we'll implement variables and program-defined procedures.

The syntax for first set of supported expressions is as follows:

| Expression       | Syntax                             | Semantics and examples                                                                                                                                                                                                                                            |
| ---------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| symbol           | _symbol_                           | A symbol is interpreted as a variable name; it evaluates to the value of the variable with its name. The interpreter doens't yet support defining variables of procedures, so the only supported symbols are the primitive procedures, e.g. `+`, `string-append`. |
| constant literal | _number_ \| _string_ \| _boolean_  | Numbers, strings, and booleans evaluate to themselves, e.g. `3 => 3`, `#t => #t`                                                                                                                                                                                  |
| conditional      | `(if test consequent alternative)` | Evaluate `test`; if "truthy" (i.e. any value other than `#f`), evaluate and return `consequent`; else, evaluate and return `alternative`.                                                                                                                         |
| procedure call   | `(proc arg...)`                    | If `proc` is not a keyword, it is treated as a procedure. Evaluate `proc` and all the `args`, then calls the procedure with the arguments.                                                                                                                        |

## Scanner

Before setting up the scanner, we'll define a `Token` class and the expected token types.

<!-- prettier-ignore -->
```ts
const TokenType = {
  LeftBracket: 'LeftBracket',
  RightBracket: 'RightBracket',
  Symbol: 'Symbol',
  Number: 'Number',
  True: 'True',
  False: 'False',
  String: 'String',
  Eof: 'Eof'
};

class Token {
  constructor(tokenType, lexeme, literal) {/* ... */}
}
```

The _lexeme_ of a token is its string representation as it appears in the source program, e.g. `"if"`, `"string-append"`, `"sum"`. The _literal_ is the, er, literal value of the token, e.g. `true` and `false` for booleans, `3` for the number 3.[^dls]

[^dls]: Tokens typically also store metadata like the line and column numbers on which they appear in the source which is useful for error reporting and debugging. But I've left them out of this implementation for clarity.

In the `Scanner` class, we'll define a `scan` method that returns a list of tokens from a program source.

<!-- prettier-ignore -->
```js
class Scanner {
  start = 0; // start index of the current token
  current = 0; // current index in the source
  tokens = []; // scanned tokens

  constructor(source) {
    this.source = source;
  }

  scan() {
    while (!this.isAtEnd()) {
      // save the index for the start of the new token
      this.start = this.current;

      const char = this.advance();
      switch (char) {
        case '(':
          this.addToken(TokenType.LeftBracket);
          break;
        case ')':
          this.addToken(TokenType.RightBracket);
          break;
        case ' ':
        case '\r':
        case '\t':
        case '\n':
          break;
        // ...
      }
    }

    this.tokens.push(new Token(TokenType.Eof, '', null));
    return this.tokens;
  }

  isAtEnd() { return this.current >= this.source.length; }

  advance() { return this.source[this.current++]; }

  peek() { return this.source[this.current]; }

  addToken(tokenType, literal) {
    const lexeme = this.source.slice(this.start, this.current);
    this.tokens.push(new Token(tokenType, lexeme, literal));
  }
}
```

We advance through each character in the source string, looking for tokens as we find them. If the character is a left or right bracket, we add the corresponding token to the list; if it's a white-space character, we'll simply skip over it. After scanning the entire source, we push an `Eof` token and return the list. (We'll use the `Eof` token later in the parser to check for the end of the token list.)

We also need to scan for boolean values: `#t` and `#f`, representing `true` and `false` respectively. Inside the switch block in `scan`:

```js
case '#':
  if (this.peek() === 't') {
    this.advance();
    this.addToken(TokenType.True, true);
    break;
  }
  if (this.peek() === 'f') {
    this.advance();
    this.addToken(TokenType.False, false);
    break;
  }
```

To scan string tokens, we check for a double-quote and advance till we find a closing double-quote. The string value will be the text between the `start` and `current` indexes.

```js
case '"':
  while (this.peek() !== '"' && !this.isAtEnd()) {
    this.advance();
  }
  const literal = this.source.slice(this.start + 1, this.current);
  this.addToken(TokenType.String, literal);
  this.advance();
  break;
```

In the default case of the switch block, we'll scan for numbers and symbols. If the current character is a digit, we'll advance till the end of the number, parse it as a JavaScript float, and add the token to the list.

```js
default:
  if (this.isDigit(char)) {
    while (this.isDigitOrDot(this.peek())) {
      this.advance();
    }
    const numberAsString = this.source.slice(this.start, this.current);
    const literal = parseFloat(numberAsString);
    this.addToken(TokenType.Number, literal);
    break;
  }

// isDigit(char) { return char >= '0' && char <= '9'; }

// isDigitOrDot(char) { return this.isDigit(char) || char === '.'; }
```

Similarly, if the current character is valid for an identifier, we'll advance till the end of the identifier, and then add a `Symbol` token.

```js
if (this.isIdentifier(char)) {
  while (this.isIdentifier(this.peek())) {
    this.advance();
  }
  this.addToken(TokenType.Symbol);
  break;
}

/*
isIdentifier(char) {
  return (
    this.isDigitOrDot(char) ||
    (char >= 'A' && char <= 'Z') ||
    (char >= 'a' && char <= 'z') ||
    ['+', '-', '.', '*', '/', '<', '=', '>', '!',
     '?', ':', '$', '%', '_', '&', '~', '^'].includes(char)
  );
}
*/
```

Finally, if we find a character that doesn't match any of the known values we've discussed above, we'll throw a `SyntaxError`:

```js
default:
  // ...handled numbers, symbols...

  throw new SyntaxError(`Unknown token: ${char}`);

/*
class SyntaxError extends Error {
  toString() { return `SyntaxError: ${this.message}`; }
}
*/
```

## Parser

Next, we'll set up the parser.

As we discussed earlier, the parser transforms the list of tokens from the scanner into Abstract Syntax Trees (ASTs). To perform this transformation, we use a specification called the _formal grammar_ of the language. We can express the formal grammar of our Lisp calculator as:

```text
program    => expression*
expression => if | call | atom
if         => "(" "if" expression expression expression? ")"
call       => "(" expression expression* ")"
atom       => SYMBOL | NUMBER | TRUE | FALSE | STRING | ()
```

In longhand:

- A _program_ consists of zero or more _expression_-s
- An _expression_ is an _if_ expression, a _call_ expression, or an _atom_
- An _if_ expression is an opening bracket, followed by an "if", the test _expression_, the _consequent_ expression, an optional _alternative_ expression, and a closing bracket
- A _call_ expression is an opening bracket, followed by the _expression_ to be called, zero or more argument _expression_-s, and a closing bracket
- An _atom_ is a symbol, number, boolean, string, or the empty list

These five rules define how to translate a list of tokens into an AST. A program that does not satisfy the rules of the grammar has an malformed syntax and is invalid.

The parser we're about to implement is known as a [recursive descent parser](https://en.wikipedia.org/wiki/Recursive_descent_parser). "Descent" implies that we start from the top of the formal grammar ("program") and apply the rules until the terminal nodes (the "atoms"). "Recursive" indicates that the rules are applied recursively; the consequent of an `if` expression is also an expression, for example.

To represent the nodes of the AST, we'll define a few classes:

<!-- prettier-ignore -->
```js
class Expr {}

class CallExpr extends Expr {
  constructor(callee, args) {/* ... */}
}

class SymbolExpr extends Expr {
  constructor(token) { this.token = token; }
}

class LiteralExpr extends Expr {
  constructor(value) { this.value = value; }
}

class IfExpr extends Expr {
  constructor(condition, consequent, alternative) {/* ... */}
}
```

In the `Parser` class, we'll parse the list of tokens as a "program": a set of zero or more expressions.

<!-- prettier-ignore -->
```js
class Parser {
  current = 0;

  constructor(tokens) { this.tokens = tokens; }

  parse() {
    const expressions = [];
    while (!this.isAtEnd()) {
      const expr = this.expression();
      expressions.push(expr);
    }
    return expressions;
  }

  isAtEnd() { return this.peek().tokenType === TokenType.Eof; }

  peek() { return this.tokens[this.current]; }
}
```

The `expression` method parses the next expression in the list.

```js
// NULL_VALUE = []

expression() {
  if (this.match(TokenType.LeftBracket)) {
    if (this.match(TokenType.RightBracket)) {
      return new LiteralExpr(NULL_VALUE);
    }

    const token = this.peek();
    if (token.lexeme === 'if') return this.if();

    const callee = this.expression();

    const args = [];
    while (!this.match(TokenType.RightBracket)) {
      args.push(this.expression());
    }

    return new CallExpr(callee, args);
  }
  return this.atom();
}

match(tokenType) {
  if (this.check(tokenType)) {
    this.current++;
    return true;
  }
  return false;
}

check(tokenType) { return this.peek().tokenType === tokenType; }
```

If the current token is _not_ an opening bracket, `expression` hands over parsing to the `atom` method. If it is, it checks the next token. If that token is a closing bracket, it returns a literal expression, `null` (represented as an empty JavaScript array). But if it is an "if" token, it hands over parsing to the `if` method. If the next token is neither a closing bracket nor an "if" token, the method parses a _call expression_: an expression (the callee), followed by zero or more expressions (the arguments), until the next closing bracket.

In `if`, we parse the conditional expression:

```js
if() {
  this.advance(); // move past the "if" token
  const test = this.expression();
  const consequent = this.expression();
  let alternative;
  if (!this.match(TokenType.RightBracket)) {
    alternative = this.expression();
  }
  this.consume(TokenType.RightBracket);
  return new IfExpr(test, consequent, alternative);
}

consume(tokenType) {
  if (this.check(tokenType)) {
    return this.advance();
  }
  throw new SyntaxError(`Unexpected token ${this.previous().tokenType}, expected ${tokenType}`);
}

previous() { return this.tokens[this.current - 1]; }
```

Finally, in `atom`, we parse the remaining atomic expressions.

```js
atom() {
  switch (true) {
    case this.match(TokenType.Symbol):
      return new SymbolExpr(this.previous());
    case this.match(TokenType.Number):
    case this.match(TokenType.String):
    case this.match(TokenType.True):
    case this.match(TokenType.False):
      return new LiteralExpr(this.previous().literal);
    default:
      throw new SyntaxError(`Unexpected token: ${this.peek().tokenType}`);
  }
}
```

## Interpreter

We're now at the core of the interpreter itself. The scanner and parser have checked that the input program is valid, reporting any syntax errors, and transformed the program into a friendly tree structure. Now, the interpreter will evaluate (or interpret) the tree.

We'll define an `Interpreter` class and its environment.

```js
class Interpreter {
  constructor() {
    this.env = new Map(
      Object.entries({
        '*': ([a, b]) => a * b,
        '+': ([a, b]) => a + b,
        '/': ([a, b]) => a / b,
        '-': ([a, b]) => a - b,
        '=': ([a, b]) => a === b,
        remainder: ([a, b]) => a % b,
        '>=': ([a, b]) => a >= b,
        '<=': ([a, b]) => a <= b,
        not: ([arg]) => !arg,
        'string-length': ([str]) => str.length,
        'string-append': ([a, b]) => a + b,
        list: (args) => args,
        'null?': ([arg]) => arg === NULL_VALUE,
        'list?': ([arg]) => arg instanceof Array,
        'number?': ([arg]) => arg instanceof Number,
        'procedure?': ([arg]) => arg instanceof Function,
        car: ([arg]) => arg[0],
        cdr: ([arg]) => (arg.length > 1 ? arg.slice(1) : NULL_VALUE),
        cons: ([a, b]) => [a, ...b],
        display: ([arg]) => console.log(arg),
      })
    );
  }
}
```

The environment, `env`, maps a variable name to its value. For now, `env` only holds the primitive procedures and their implementations; but later on, we'll extend the environment to support user-defined variables and procedures as well as local environments.

We'll add an `interpretAll` methods to interpret the expressions returned by the parser. In `interpret`, we evaluate the given expressions according to their type: literal expressions evaluate to themselves; symbol expressions evaluate to the value of the variable of the same name.

```js
interpretAll(expressions) {
  let result;
  for (const expr of expressions) {
    result = this.interpret(expr, this.env);
  }
  return result;
}

interpret(expr, env) {
  if (expr instanceof LiteralExpr) {
    return expr.value;
  }
  if (expr instanceof SymbolExpr) {
    if (env.has(expr.token.lexeme)) {
      return env.get(expr.token.lexeme);
    }
    throw new RuntimeError(`Unknown identifier: ${name}`);
  }
  // ...
}
```

Conditional expressions evaluate to the consequent if the test expression is _truthy_ (that is, not `false`); else they evaluate to the alternative.

```js
if (expr instanceof IfExpr) {
  const condition = this.interpret(expr.condition, env);
  if (condition !== false) {
    return this.interpret(expr.consequent, env);
  }
  return this.interpret(expr.alternative, env);
}
```

Finally, call expressions evaluate the procedure to be called, evaluate the arguments, and then call the procedure with the arguments.

```js
const callee = this.interpret(expr.callee, env);
const args = expr.args.map((arg) => this.interpret(arg, env));
if (callee instanceof Function) {
  return callee(args);
}
throw new RuntimeError(`Cannot call ${callee}`);
```

## REPL

The implementation for the Lisp calculator is now complete, and we'll need a way to run and test it.

Among its many other legacies, Lisp is famous for popularizing the [read-eval-print-loop (REPL)](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop), an interactive shell that takes single user inputs, executes them, and returns the result to the user. We'll add one to our interpreter using Node's [repl](https://nodejs.org/api/repl.html) module.

```js
const repl = require('repl');

repl.start({
  prompt: 'jscheme> ',
  eval: (input, context, filename, callback) => {
    callback(null, stringify(run(input)));
  },
});

function stringify(value) {
  if (value === false) return '#f';
  if (value === true) return '#t';
  if (Array.isArray(value)) return '(' + value.map(stringify).join(' ') + ')';
  if (value instanceof Function) return 'PrimitiveProcedure';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}
```

We can now run Scheme expressions in the shell and see the printed results:

```scheme
$ node index.js
jscheme> (+ 34 (car (list 4 3 2 1)))
'38'
jscheme> (string-append "hello, " "world")
'"hello, world"'
jscheme> (if (< (/ 22 7) 3.14) #t #f)
'#f'
jscheme> +
'PrimitiveProcedure'
jscheme> (cons (car (list 7 8 9)) (cdr (list 1 (list 2 3) 4)))
'(7 (2 3) 4)'
```

## Global variables

Our interpreter can now evaluate simple expressions, but to make any reasonably complex program, we'll need a way to create, assign, and access variables. We'll add a `define` special form for creating global variables, and a `set!` special form for changing the value of a variable.[^dlm]

[^dlm]: Note why `define` and `set!` are both special forms. Non-special-form procedures evaluate all their arguments before using them. But `define` and `set!` cannot be evaluated that way since they _cannot_ evaluate their first argument, the identifier name.

```scheme
jscheme> (define x (+ 2 3)) x
'5'
jscheme> (set! x (- 8 1)) x
'7'
```

The parser grammar for the `define` special form is as follows:

```text
expression => if | call | define | set! | atom
define     => "(" "define" SYMBOL expression ")"
set!       => "(" "set" SYMBOL expression ")"
```

We'll update the `expression` method in the parser, and then add methods to parse the new special forms.

```js
expression() {
  // ... if (token.lexeme === 'if') ...
  if (token.lexeme === 'define') return this.define();
  if (token.lexeme === 'set!') return this.set();
  // ...
}

define() {
  this.advance(); // move past the "define" token
  const name = this.consume(TokenType.Symbol);
  const value = this.expression();
  this.consume(TokenType.RightBracket);
  return new DefineExpr(name, value);
}

set() {
  this.advance(); // move past the "set!" token
  const name = this.consume(TokenType.Symbol);
  const value = this.expression();
  this.consume(TokenType.RightBracket);
  return new SetExpr(name, value);
}

// class DefineExpr extends Expr {
//   constructor(name, value) {/* ... */}
// }
// class SetExpr extends Expr {
//   constructor(name, value) {/* ... */}
// }
```

Then in the interpreter:

```js
if (expr instanceof DefineExpr) {
  const value = this.interpret(expr.value);
  env.set(expr.name.lexeme, value);
  return value;
}
if (expr instanceof SetExpr) {
  const value = this.interpret(expr.value);
  if (env.has(expr.name.lexeme)) {
    env.set(expr.name.lexeme, value);
    return value;
  }
  throw new RuntimeError(`Unknown identifier: ${name}`);
}
```

## Local variables

To implement locally-scoped variables in the interpreter, we'll add a new special form called `let`:

```scheme
jscheme> (define x 1)
jscheme> (let ((x 2) (y 4)) (display x) (display y))
'2'
'4'
jscheme> (display x) (display y)
'1'
Error: Unknown identifier: y
```

To support local scopes, the environment needs to be able to access variables in the current scope as well as in "higher", or enclosing, scopes.[^slf] We'll change the environment object from a JavaScript `Map` to an instance of an `Environment` class.

[^slf]: In [Pointers in Go](https://chidiwilliams.com/post/pointers-in-go/#local-variables-in-lox), I wrote briefly about how this linked-list implementation of environments is used in the Lox intepreter from Bob Nystrom's _Crafting Interpreters_.

```js
class Environment {
  constructor(params = [], args, enclosing) {
    this.values = new Map();
    // sets the initial bindings in the environment
    params.forEach((param, i) => {
      this.values.set(param.lexeme, args[i]);
    });
    this.enclosing = enclosing;
  }

  define(name, value) {
    this.values.set(name, value);
  }

  // Sets the variable value in the
  // environment in which it was defined
  set(name, value) {
    if (this.values.has(name, value)) {
      this.values.set(name, value);
      return;
    }
    if (this.enclosing) {
      this.enclosing.set(name, value);
      return;
    }
    throw new RuntimeError(`Unknown identifier: ${name}`);
  }

  // Looks up the variable in the environment
  // as well as its enclosing environments
  get(name) {
    if (this.values.has(name)) {
      return this.values.get(name);
    }
    if (this.enclosing) {
      return this.enclosing.get(name);
    }
    throw new RuntimeError(`Unknown identifier: ${name}`);
  }
}
```

As before, we'll update the parser grammar for the `let` form:

```text
expression  => if | call | define | set! | let | atom
let         => "(" "let" "(" let-binding* ")" expression* ")"
let-binding => "(" SYMBOL expression ")"
```

Then in the parser:

```js
expression() {
  // ...
  if (token.lexeme === 'let') return this.let();
  // ...
}

let() {
  this.advance(); // move past the "let" token
  this.consume(TokenType.LeftBracket);

  const bindings = [];
  while (!this.match(TokenType.RightBracket)) {
    bindings.push(this.letBinding());
  }

  const body = [];
  while (!this.match(TokenType.RightBracket)) {
    body.push(this.expression());
  }

  return new LetExpr(bindings, body);
}

letBinding() {
  this.consume(TokenType.LeftBracket);
  const name = this.consume(TokenType.Symbol);
  const value = this.expression();
  this.consume(TokenType.RightBracket);
  return new LetBindingNode(name, value);
}

// class LetExpr {
//   constructor(bindings, body) { ... }
// }

// class LetBindingNode {
//   constructor(name, value) { ... }
// }
```

To evaluate `LetExpr`-essions, we evaluate the values in the bindings, create a new environment with the current one as its enclosing environment, and evaluate the body of the expression **within the new environment**. In the interpreter:

```js
if (expr instanceof LetExpr) {
  const names = expr.bindings.map((binding) => binding.name);
  const values = expr.bindings.map((binding) => this.interpret(binding.value, env));

  const letEnv = new Environment(names, values, env);

  let result;
  for (const exprInBody of expr.body) {
    result = this.interpret(exprInBody, letEnv);
  }
  return result;
}
```

## Lambdas

In this section, we'll add a final construct to our interpreter: the lambda expression.

Lambdas in Scheme declare zero or more parameters followed by one or more expressions as its body. When a lambda is called, the interpreter sets the values of its parameters according to the passed arguments, evaluates the body of the lambda, and returns the result.

Lambdas are also _first-class_ objects in Scheme: they can be assigned to variables like other data types, passed as arguments into other lambdas, and so on.

```scheme
jscheme> (define square
           (lambda (n)
             (display "square was called")
             (* n n)))
jscheme> (square 3)
'"square was called"'
'9'
jscheme> (procedure? square)
'#t'
```

Lambdas also "hang on" to the environment in which they are defined (the pair is often called a _closure_) and can access and modify that environment when called.

```scheme
jscheme> (define increment-generator
           ;; returns a lambda that returns the next increment
           (lambda ()
             (let ((n 0))
               (lambda () (set! n (+ n 1)) n))))
jscheme> (define next (increment-generator))
jscheme> (next)
'1'
jscheme> (next)
'2'
```

We'll update the parser grammar for the lambda form:

```text
expression => if | call | define | set! | let | lambda | atom
lambda     => "(" "lambda" "(" SYMBOL* ")" expression* ")"
```

Then in the parser:

```js
expression() {
  // ...
  if (token.lexeme === 'lambda') return this.lambda();
  // ...
}

lambda() {
  this.advance(); // move past the "lambda" token
  this.consume(TokenType.LeftBracket);

  const params = [];
  while (!this.match(TokenType.RightBracket)) {
    params.push(this.consume(TokenType.Symbol));
  }

  const body = [];
  while (!this.match(TokenType.RightBracket)) {
    body.push(this.expression());
  }

  return new LambdaExpr(params, body);
}

// class LambdaExpr extends Expr {
// 	constructor(params, body) { ... }
// }
```

To evaluate a lambda expression, we create and return a new `Procedure` object, holding the lambda's declaration and the current environment as its closure. In the interpreter:

```js
interpret(expr, env) {
  // ...
  if (expr instanceof LambdaExpr) {
    return new Procedure(expr, env);
  }
  // ...
}

// class Procedure {
//   constructor(declaration, closure) { ... }
// }
```

Now, to evaluate a call expression (e.g. `(proc arg1)`), we check to see if the procedure to be called is a `Procedure` object, and then call a `call` method on the object:

```js
// ...
if (expr instanceof CallExpr) {
  const callee = this.interpret(expr.callee, env);
  const args = expr.args.map((arg) => this.interpret(arg, env));

  if (callee instanceof Procedure) {
    return callee.call(this, args);
  }

  // Call primitive procedure
  if (callee instanceof Function) {
    return callee(args);
  }
  throw new RuntimeError(`Cannot call ${callee}`);
}
// ...
```

In `call`, we create a new environment for the lambda call, with the arguments bound to the lambda's parameters and the closure set as the enclosing environment. Then we evaluate the body of the lambda and return the result.

```js
class Procedure {
  // ...
  call(interpreter, args) {
    const env = new Environment(this.declaration.params, args, this.closure);
    let result;
    for (const expr of this.declaration.body) {
      result = interpreter.interpret(expr, env);
    }
    return result;
  }
}
```

## Tail-call elimination

Before we can claim our interpreter is complete, there's an important optimization we need to make.

You may have noticed that we did not implement a loop construct (like a "for" or "while" loop in other languages) in the earlier sections. That's because we don't quite need one: looping in Scheme is done by recursion—and the interpreter already supports that.

```scheme
jscheme> (define sum-to
           (lambda (n acc)
             (if (= n 0)
                 acc
                 (sum-to (- n 1) (+ n acc))))
jscheme> (sum-to 1 0)
'1'
jscheme> (sum-to 2 0)
'3'
jscheme> (sum-to 3 0)
'6'
jscheme> (sum-to 100 0)
'5050'
```

But because each procedure call calls `this.interpret(expr)`, recursing over a large number of items blows up the call stack of the interpreter.

```scheme
jscheme> (sum-to 100000 0)
RangeError: Maximum call stack size exceeded
```

However, since the recursion in `sum-to` is in _tail position_ (that is, the recursive call is the final expression called by the lambda if `n != 0`), we can evaluate the call iteratively instead of recursively.

Let's represent the pseudocode for `sum-to` as follows:

```text
function sum-to(n, acc):
  if n = 0 then
    return acc
  else
    return sum-to(n - 1, acc + n)
```

Since the recursive call is in the tail position, we have nothing else to do once `sum-to(n - 1, acc + n)` completes; we immediately return its result.

For this reason, instead of recursing and allocating a new stack frame, we can "hand over" the body of the function to the new call: instead of recursively calling `sum-to`, we'll update the function's arguments and jump back to the top of the function's body.

```text
function sum-to(n, acc):
start:
	if n = 0 then
		return acc
  else
  	n = n - 1
  	acc = acc + n
  	GOTO start
```

We'll add this optimization, called [tail-call elimination](https://en.wikipedia.org/wiki/Tail_call), to our Scheme interpreter. When evaluating a procedure call in the tail position, the interpret will update the current frame and make a [GOTO](https://chidiwilliams.com/post/goto/)-like jump to the top of the `interpret` method instead of recursing.[^dks]

[^dks]: There are a number of other ways to implement tail-call elimination, including writing a VM and using trampolines. But both methods are much more involved than using `continue` and hence far beyond the scope of this essay. See the Wikipedia entry on [tail-call implementation methods](https://en.wikipedia.org/wiki/Tail_call#Implementation_methods) or Eli Bendersky's essay on [recursion, continuations, and trampolines](https://eli.thegreenplace.net/2017/on-recursion-continuations-and-trampolines/).

Let's review how we currently interpret call expressions:

```js
interpret(expr, env) {
  if (expr instanceof CallExpr) {
    const callee = this.interpret(expr.callee, env);
    const args = expr.args.map((arg) => this.interpret(arg, env));

    if (callee instanceof Procedure) {
      const callEnv = new Environment(callee.declaration.params, args, this.closure);

      // Recursively interpret all the expressions
      // in the function body within `callEnv`
      let result;
      for (const exprInBody of callee.declaration.body) {
        result = this.interpret(exprInBody, callEnv);
      }
      return result;
    }
    // ...
  }
  // ...
}
```

Instead of recursively interpreting _all_ the expressions in the procedure's body, when we get to the last expression, we want to update the frame of the `interpret` method and "jump" back to the top.

```js
interpret(expr, env) {
  startInterpret:
  if (expr instanceof CallExpr) {
    // ...
    if (callee instanceof Procedure) {
      // ...
      const callBody = callee.declaration.body;

      // Recursively interpret all expressions in the body, *except the last*
      for (const exprInBody of callBody.slice(0, -1)) {
        this.interpret(exprInBody, callEnv);
      }

      // For the last expression, update expr
      // and env and jump back to the top ↑↑
      expr = callBody[callBody.length - 1];
      env = callEnv;
      GOTO startInterpret;
    }
    // ...
  }
  // ...
}
```

JavaScript does not have a GOTO statement, so we'll use the next best thing: we'll place the entire body of the `interpret` method inside a while loop, and then `continue` the loop to jump back to the top.

```js
interpret(expr, env) {
  while (true) {
    if (expr instanceof CallExpr) {
      // ...
      if (callee instanceof Procedure) {
        // ...
        for (const expr of callBody.slice(0, -1)) {
          this.interpret(expr, callEnv);
        }
        expr = callBody[callBody.length - 1];
        env = callEnv;
        continue;
      }
      // ...
    }
    // ...
  }
}
```

This effectively jumps back to the top of the method and evaluates the tail expression with its correct environment without recursing. So, we can now call tail-recursive functions with large inputs without getting overflowing the stack!

```js
jscheme> (sum-to 10000 0)
50005000
```

We may also add this same optimization in the other places where we evaluate tail expressions, like when interpreting let and if expressions.

```js
interpret(expr, env) {
  while (true) {
    // ...
    if (expr instanceof IfExpr) {
      const test = this.interpret(expr.test, env);
      // Instead of calling this.interpret() on the consequent or alternative, update the expr argument and continue the loop
      expr = test !== false ? expr.consequent : expr.alternative;
      continue;
    }

    if (expr instanceof LetExpr) {
      const letEnv = new Environment(names, values, env);

      // Recursively interpret all the expression in the body, *except the last one*
      for (const exprInBody of expr.body.slice(0, -1)) {
        this.interpret(exprInBody, letEnv);
      }

      // for the tail expression, update expr
      // and env and continue the loop
      expr = expr.body[expr.body.length - 1];
      env = letEnv;
      continue;
    }

    // ...
  }
}
```

Our Scheme interpreter is still far from complete: it lacks comments, ports, vectors, call-with-current-continuation, dotted pair notation, quotes and quasiquotes, many primitive procedures, comprehensive error detection and recovery, and more. But it implements many of the core features of the language and, hopefully, has given a decent insight into some of the inner workings of interpreters. We can take a victory lap here.

The complete source code is available [on GitHub](https://github.com/chidiwilliams/jscheme).
