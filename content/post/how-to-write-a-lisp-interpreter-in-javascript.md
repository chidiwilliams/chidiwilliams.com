---
title: How to Write a Lisp Interpreter in JavaScript
date: 2022-03-27T12:00:00+00:00
draft: true
categories: [languages]
---

In a [previous essay](), I showed how to write an expression evaluator in JavaScript. The program, `evaluate`, accepted arithmetic expressions like `324 * (2^2 + (3 / (5 + 1)))`. And in a [later essay](), I showed how to add additional features to the evaluator: like a simple environment for storing and retrieving variables, logical operators, like <, >, and =, and IF function. The evaluator worked by converting expressions from infix to postfix notation using the shunting yard algorithm and then evaluating the expression in its postfix format.

In this essay, we'll discuss how to build a similar but more advanced program. As the title suggests, we'll implement an interpreter a dialect of Lisp called Scheme. Along the way, we'll discuss some of the core concepts behind interpreters, the stages of the interpreter like the tokenizer/scanner, parser, and the core of the interpreter. I'll simplify some of the implementation of the interpreter and for clarity, but the full link to the code is available on GitHub.

My goal here is to show the basic concepts behind interpreters rather than making a production-ready interpreter. So I may have skipped some core features, or used a less performant implementation in some places. This would also help you understand a bit better how programming languages work.

This essay is inspired by Peter Norvig's [essay on making a Lisp Interpreter with Python](https://norvig.com/lispy.html). Many ideas on the presentation and format of the post are based on his essay.

We'll start off by discussing what Scheme is and why it's a good choice for a language interpreter. We'll implement support for arithmetic, string, and list operations. Next, we'll add conditional expressions, variables, and then lambdas.

## A brief introduction to Scheme

Scheme is a minimalist dialect of the Lisp family of programming languages. Scheme is very popular for being minimalist and is much easier to implement than most other languages of comparable expressive power. Which is why we'll be choosing it for our choice of language for this essay.

s-expressions

> The [Scheme 48](https://en.wikipedia.org/wiki/Scheme_48) implementation is so-named because the interpreter was written by Richard Kelsey and Jonathan Rees in 48 hours

Scheme syntax is much easier than the syntax of other languages.

- All Scheme programs consist solely of expressions. There is no distinction between statements and expressions.
- Numbers (e.g. 1), strings (e.g. "hello world"), symbols (e.g. `name`) are _atomic expressions_; they cannot be broken into smaller pieces. In Scheme, operators like `+` and `/` are symbols too.
- Everything else is a _list expression_: an opening bracket "(", followed by one or more other expressions, followed by a closing bracket ")". The first element of the list determines what it means:
  - If the list starts with a keyword, e.g. `(if ...)`, the list expression is a _special form_; the meaning depends on the keyword
  - If the list starts with a non-keyword, e.g. `(fn ...)`, then the expression is a function call

Here are a few Scheme expressions to get you more familiar with the syntax:

```scheme
10                                   ; 10
(+ 137 349)                          ; 486
(+ (* 3
      (+ (* 2 4)
         (+ 3 5)))
   (+ (- 10 7) 6))                   ; 57
(define odd?
  (lambda (x)
    (= 1 (remainder x 2))))
(filter odd? (list 1 2 3 4 5))       ; (1 3 5)
(define fibonacci
  (lambda (num)
    (if (<= num 1)
        num
        (+ (fibonacci (- num 1))
           (fibonacci (- num 2))))))
(fibonacci 20)                       ; 6765
```

## General architecture

Let's briefly discuss here the general architecture of the interpreter. Each section of the interpreter describes a stage in the process of interpreting, or _running_, the source code of the program.

The interpreter is divided into three main stages: scanning, parsing, and interpreting. The post on making an expression evaluator also had similar steps of breaking down the evaluator into its core components.

> Scanner -> Parser -> Interpreter

The _Scanner_ takes in the text repressing the source code of the program as a string and extracts the meaning components, or _tokens_, into a list. It discards unneeded whitespace characters and also reports error on unknown or unexpected characters.

The _Parser_ then, err, parses the list of tokens from the scanner into an Abstract Syntax Tree (AST). An AST represents the syntactic structure of the source program. For example, here's a program and its AST:

```scheme
(define odd?
  (lambda (x)
    (= 1 (remainder x 2))))

;;; TODO: Probably convert this to an image to help with resizing
;;; AST:
;;;
;;; DefineExpr
;;; |- name: odd?
;;; |- value: LambdaExpr
;;;           |- params: [x]
;;;           |- body: CallExpr
;;;                    |- callee: SymbolExpr
;;;                    |          |- value: =
;;;                    |- args: Expr[]
;;;                             |- LiteralExpr
;;;                             |  |- value: 1
;;;                             |- CallExpr
;;;                                |- callee: SymbolExpr
;;;                                |          |- value: remainder
;;;                                |- args: Expr[]
;;;                                         |- SymbolExpr
;;;                                         |  |- value: x
;;;                                         |- SymbolExpr
;;;                                            |- value: 2
```

Each node in the AST describes some syntactic component in the program. The scanner returns the useful components of the program as a simple, flat list of tokens; but the result of the parser actually has meaning. A `LiteralExpr` node represents a literal value, like a number or a string; a `CallExpr` node describes a function call expression; a `LambdaExpr` node defines a lambda expression, and so on.

Finally, the _Interpreter_ executes the AST. It walks from the top of the tree to the bottom and executes each node recursively to return the final result of the computation.

> Maybe move this to later when we define the REPL.

We may define a `run` function to execute all three steps as follows:

```js
function run(source) {
  const scanner = new Scanner(source);
  const tokens = scanner.scan();

  const parser = new Parser(tokens);
  const expressions = parser.parse();

  const interpreter = new Interpreter();
  return interpreter.interpretAll(expressions);
}
```

## Lisp calculator

We'll begin with an implementation of a simple "calculator". The calculator will be able to perform basic arithmetic, boolean, string, and list operations. Then in later sections, we'll add state and user- or program-defined procedures.

| Expression       | Syntax                            | Semantics and examples                                                                                                                                                                        |
| ---------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| symbol           | _symbol_                          | A symbol is interpreted as a variable name; its value is the variable's value. We don't yet support defining variables and procedures, so the only known symbols are the built-in procedures. |
| constant literal | _number_ \| _string_ \| _boolean_ | Numbers, strings, and booleans evaluate to themselves.                                                                                                                                        |
| conditional      | `(if test conseq alt)`            | Evaluate `test`; if true, evaluate and return `conseq`; otherwise, evaluate and return `alt`.                                                                                                 |
| procedure call   | `(proc arg...)`                   | If `proc` is anything other than `if`, it is treated as a procedure. Evaluate `proc` and all the `args`. Then, apply the procedure to the list of _arg_ values.                               |

We'll define the token types used in the scanner and parser as well as a `Token` class to hold tokens and their values.

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

The _lexeme_ of the token is the string representation of the token as it appears in the source, for example `"if"`, `"3"`, `"a-string"`, etc; while the _literal_ is the literal value of the token, for example `true` and `false` for booleans, `3` for the number 3.[^djs]

[^djs]: Tokens may also contain metadata like the line and column numbers in which they appear. These metadata are useful when debugging or printing syntax errors to the user, but I've left them out for clarity.

## Scanner

We'll setup the `Scanner` class with the source of the program as a string.

<!-- prettier-ignore -->
```js
class Scanner {
  start = 0; // start index of the current token
  current = 0; // current index in the source
  tokens = []; // scanned tokens

  constructor(source) {/* ... */}
}
```

Then, in the `scan` method, we'll step through the source, scanning for tokens.

```js
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
```

In the block above, we advance through the source string till we get to the end. Then we add left- and right-bracket tokens when we meet them in the string. We also skip through (or ignore) white-space characters. After scanning all the tokens, we push an `Eof` token to the list and then return the list. Later on in the parser, we'll use the `Eof` token to check for the end of the token list.

The utility functions we used earlier are defined as:

<!-- prettier-ignore -->
```js
isAtEnd() { return this.current >= this.source.length; }

advance() { return this.source[this.current++]; }

addToken(tokenType, literal) {
  const lexeme = this.source.slice(this.start, this.current);
  const token = new Token(tokenType, lexeme, literal);
  this.tokens.push(token);
}
```

Next, we'll add support for scanning boolean values. To represent `true` and `false`, Scheme uses `#t` and `#f` respectively. In the switch block in the `Scanner` class:

```js
case '#':
  if (this.peek() === 't') {
    this.advance();
    this.addToken(TokenType.True);
    break;
  }
  if (this.peek() === 'f') {
    this.advance();
    this.addToken(TokenType.False);
    break;
  }
```

To scan string tokens, we'll check for a double-quote character and advance till we find the closing double-quote. The value of the string will be the text between the start and current indexes.

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

In the default case of the switch block, we'll scan for numbers and symbols. If the current character matches a digit, we'll advance till we get to the end of the number, parse the number as a JavaScript float, and add the token to the list.

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
```

To check for digits, dots, and identifiers:

<!-- prettier-ignore -->
```js
isDigit(char) { return char >= '0' && char <= '9'; }

isDigitOrDot(char) { return this.isDigit(char) || char === '.'; }

isIdentifier(char) {
  return (
    this.isDigitOrDot(char) ||
    (char >= 'A' && char <= 'Z') ||
    (char >= 'a' && char <= 'z') ||
    ['+', '-', '.', '*', '/', '<', '=', '>', '!',
     '?', ':', '$', '%', '_', '&', '~', '^'].includes(char)
  );
}
```

Finally, if we find a character that doesn't match any of the known values we've discussed above, we'll throw a `SyntaxError`:

```js
default:
  // ...
	throw new SyntaxError(`Unknown token ${char}`);

// class SyntaxError extends Error {
//   toString() { return `SyntaxError: ${this.message}`; }
// }
```

Then, we can wrap the `scan` function in a try-catch block to print out a helpful error message to the user.

```js
scan() {
  try {
    // ...
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(error.toString());
      return this.tokens;
    }
    throw error;
  }
}
```

## Parser

Next, we'll set up the `Parser` class. As we discussed earlier, the parser converts the flat list of tokens returned by the scanner into Abstract Syntax Trees (ASTs). To perform this transformation, we use a specification called the _formal grammar_ of the language.

We can express the formal grammar of our Lisp calculator as:

```text
program    => expression*
expression => if | call | atom
if         => "(" "if" expression expression expression? ")"
call       => "(" expression expression* ")"
atom       => SYMBOL | NUMBER | TRUE | FALSE | STRING | ()
```

To explain what the table means:

- A _program_ consists of zero or more *expression*s
- An _expression_ is an _if_ expression, a _call_ expression, or an _atom_
- An _if_ expression is an opening bracket, followed by an "if", the test _expression_, the _then_ expression, an optional _else_ expression, and a closing bracket
- A _call_ expression if an opening bracket, followed by the _expression_ to be called, zero or more argument *expression*s, and a closing bracket
- An _atom_ is a symbol, number, boolean, string, or the empty list

These five rules describe how translate the list of tokens from the scanner into an AST like we saw in the introductory section. By applying the rules to the source program, we also find syntax errors—places where the expressions and atoms in the program do not match the rules. And then, we can report those errors as syntax errors to the user.

The type of parser we'll use in this interpreter implementation is known as a [recursive descent parser](https://en.wikipedia.org/wiki/Recursive_descent_parser). "Descent" implies that we'll start parsing from the top of the formal grammar, `program`, and apply the rules till the terminal nodes in the grammar, like the atoms. "Recursive" implies that some of the rules are applied recursively; for example, the "then" of an `if` expression may be another `if` expression.

Before we write up the parser, let's add a few classes to represent the AST nodes.

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
  constructor(condition, thenBranch, elseBranch) {/* ... */}
}
```

We'll initialize a `Parser` by passing in the list of tokens from the scanner.

```js
class Parser {
  // the index of the current token being parsed
  current = 0;

  constructor(tokens) {
    this.tokens = tokens;
  }
}
```

Next, we'll define a `parse` method to parse the tokens into an array of `Expr`essions.

```js
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
```

The `expression` method parses the next expression in the list. It is defined as:

<!-- prettier-ignore -->
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

First, the parser checks if the current token is an opening bracket. If it isn't, it hands over to the `atom` method. But if it is, it checks the next token. If the next token is a closing bracket, it returns a literal expression containing `null` (represented as an empty JavaScript array). If instead, the token after the opening bracket is an `"if"` token, the method calls `if()`. Finally, if the next token was neither a closing bracket nor an "if", the parser parses a call expression: an expression (the callee), followed by zero or more expressions (the arguments), till the next closing bracket.

In `if`, we parse the expressions for the condition, then-branch, and optional else-branch of the conditional.

```js
if() {
  this.advance(); // move past the "if" token
  const condition = this.expression();
  const thenBranch = this.expression();
  let elseBranch;
  if (!this.match(TokenType.RightBracket)) {
    elseBranch = this.expression();
  }
  this.consume(TokenType.RightBracket);
  return new IfExpr(condition, thenBranch, elseBranch);
}

consume(tokenType) {
  if (this.check(tokenType)) {
    return this.advance();
  }
  throw new SyntaxError(`Unexpected token ${this.previous().tokenType}, expected ${tokenType}`);
}

previous() { return this.tokens[this.current - 1]; }
```

Finally, in the `atom` method, we parse the tokens representing atoms.

```js
atom() {
  switch (true) {
    case this.match(TokenType.Symbol):
      return new SymbolExpr(this.previous());
    case this.match(TokenType.Number):
    case this.match(TokenType.String):
      return new LiteralExpr(this.previous().literal);
    case this.match(TokenType.True):
      return new LiteralExpr(true);
    case this.match(TokenType.False):
      return new LiteralExpr(false);
    default:
      throw new SyntaxError(`Unexpected token: ${this.peek().tokenType}`);
  }
}
```

> TODO: Add interactive REPL that converts code to AST.

## Interpreter

We've now reached the core of the interpreter itself. The scanning and parsing phases prepared the way, reporting errors about ill-formed programs and converting well-formed ones to an accessible format: the AST. But here in the interpreter, we'll do the work of running or interpreting the tree.

First, we'll define the `Interpreter` class and its environment.

```js
class Interpreter {
  constructor() {
    this.env = {
      // (* 2 3) => 6
      '*': ([a, b]) => a * b,
      // (+ 9 3) => 12
      '+': ([a, b]) => a + b,
      // (/ 56 7) => 8
      '/': ([a, b]) => a / b,
      // (- 3 9) => -6
      '-': ([a, b]) => a - b,
      // (= 7 (+ 2 5)) => #t
      '=': ([a, b]) => a === b,
      // (remainder 5 3) => 2
      'remainder': ([a, b]) => a % b,
      // (>= 3 (* 2 2)) => #f
      '>=': ([a, b]) => a >= b,
      // (<= (/ 3 2) 1.5) => #t
      '<=': ([a, b]) => a <= b,
      // (not #t) => #f
      'not': ([arg]) => !arg,
      // (string-length "hello world") => 11
      'string-length': ([str]) => str.length,
      // (string-append "hey " "there") => "hey there"
      'string-append': ([a, b]) => a + b,
      // (list 1 2 3) => (1 2 3)
      'list': (args) => args,
      // (null? ()) => #t
      'null?': ([arg] => arg === NULL_VALUE),
      // (list? (list 1 2)) => #t
      'list?': ([arg]) => arg instanceof Array,
      // (number? (+ 1 5)) => #t
      'number?': ([arg]) => arg instanceof Number,
      // (procedure? string-length) => #t
      'procedure?': ([arg]) => arg instanceof Function,
      // (car (list 1 2 3)) => 1
      'car': ([arg]) => arg[0],
      // (cdr (list 1 2 3)) => (2 3)
      'cdr': ([arg]) => arg.length > 1 ? arg.slice(1) : NULL_VALUE,
      // (cons 1 (list 2 3)) => (1 2 3)
      'cons': ([a, b]) => [a, ...b],
      // (display "hello") => prints "hello" to the console
      'display': ([arg]) => print(arg)
    };
  }
}
```

The environment, `env`, maps a name to a value. For now, we'll store built-in procedures in a plain JavaScript object as the environment. Later on, we'll extend the implementation to support user-defined variables and procedures and local environments.

We'll add an `interpretAll` method to interpret the expressions returned by the parser. The method interprets each expression in turn and then returns the final result.

```js
interpretAll(expressions) {
  let result;
  for (const expr of expressions) {
    result = this.interpret(expr, this.env);
  }
  return result;
}

interpret(expr, env) {/* ... */}
```

In `interpret`, we interpret the given expression according to its type. Literal expressions evaluate to themselves.

```js
if (expr instanceof LiteralExpr) {
  return expr.value;
}
```

Symbol expressions evaluate to the value of the variable stored in the environment.

```js
if (expr instanceof SymbolExpr) {
  const value = env[expr.token.lexeme];
  if (value === undefined) {
    throw new RuntimeError(`Unknown identifier ${name}`);
  }
  return value;
}
```

If expressions evaluate to their then-branch if the condition evalutes to `true`; else they evaluate to their else-branch.

```js
if (expr instanceof IfExpr) {
  const condition = this.interpret(expr.condition, env);
  if (condition !== false) {
    return this.interpret(expr.thenBranch, env);
  }
  return this.interpret(expr.elseBranch, env);
}
```

Finally, a call expression evaluates the procedure to be called, evaluates the parameters, and then calls the procedure with the arguments.

```js
if (expr instanceof CallExpr) {
  const callee = this.interpret(expr.callee, env);
  const args = expr.args.map((arg) => this.interpret(arg, env));
  if (callee instanceof Function) {
    return callee(args);
  }
  throw new RuntimeError(`Cannot call ${callee}`);
}
```

## REPL

Now the scanner, parser, and interpreter for the Lisp calculator are complete, we may not write a `run` function to interpret a source text and return the result.

> This function is repeated in an earlier section. Should remove the first one if not needed there.

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

It might be tedious to have to enter `run("...")` all the time. One of Lisp's great legacies is the notion of an interactive read-eval-print-loop: a way for a programmer to enter an expression, and see it run immediately, evaluated, and printed, without having to go through a lengthy build/compile/run cycle. Did Lisp popularize the REPL?

We'll add a REPL to our own interpreter using Node's REPL module:

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
  if (Array.isArray(value)) return `(${value.join(' ')})`;
  if (value instanceof Function) return 'PrimitiveProcedure';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}
```

Here's the REPL in action:

```scheme
$ node index.js
jscheme> (+ 34 (car (list 4 3 2 1)))
'38'
jscheme> (string-append "hello, " "world")
'"hello, world"
jscheme> (if (< (/ 22 7) 3.14) #t #f)
'#f'
jscheme> +
'PrimitiveProcedure'
```

## Global environment

By this point, the interpreter can now evaluate expressions and handle arithmetic, boolean, list, and string expressions. But to make any reasonably complex program, we'll need a way to set state, assign a value to a variable and possibly update the value of the variable. The expressions can get the values of the built-in procedures stored in the interpreter's environment, but there's no way to update the environment.

We'll add a `define` procedure for creating variables in the global scope; and a `set!` procedure for changing the value of a variable.[^dlm]

[^dlm]: `define` here is a special-form and not a procedure. Remember that procedures are evaluated by evaluating all the argument first and then calling the procedure. But `define` cannot be implemented that way since it must not evaluate its first argument, the identifier name.

```scheme
(define x (+ 2 3))
(* x 6) ; 30
(set! x (- 8 1))
(* x 6) ; 42
```

After adding the `define` procedure, the parser grammar is now as follows:

```text
...
expression => if | call | define | atom
define     => "(" "define" SYMBOL expression ")"
...
```

To implement the new grammar rule, we'll update the `expression` method in the parser. And in `define` and `set`, we'll parse the rest of their respective expressions:

```js
expression() {
  // ... if (token.lexeme === 'if') return this.if();
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

Then, in the `interpret` method of the `Interpreter` class:

```js
if (expr instanceof DefineExpr) {
  const value = this.interpret(expr.value);
  env[expr.name.lexeme] = value;
  return value;
}
if (expr instanceof SetExpr) {
  const value = this.interepret(expr.value);
  env[expr.name.lexeme] = value;
  return value;
}
```

Right now, it looks like `define` and `set!` both do the operation. They interpret their `value` argument and then set the key corresponding to the variable name in the environment. In the next section on local environments, we'll see the distinction between the two procedures clearer.

## Local environments

We may also wish to add locally-scoped variables to the interpreter. The Scheme procedure, `let`, can be used to create such variables, as follows:

```scheme
(define x 1)

(let ((x 2) (y 4))
  (display x)  ; 2
  (display y)) ; 4

(display x)    ; 1
(display y)    ; Error: Unknown identifier: y
```

In the program above, the `let` procedure defines two locally-scoped variables, `x` and `y`, and sets their values to `2` and `4` respectively. These variables are only visible within the body of the `let` expression, and override the variables set in the enclosing scope.

By way of local environments, we also see the difference between `define` and `set!`: `define` sets the value of a variable within the *current* environment, while `set!` sets the value of the variable in whatever environment the variable was set in.

```scheme
(define x 1)
(let ((y 2)) (define x 3) (display x)) ; 3
(display x) ; 1
(let ((y 2)) (set! x 3) (display x)) ; 3
(display x) ; 3
```

In the example above, `define` creates a new variable `x` within the scope of the `let` expression, while `set!` changes the existing variable defined in the global scope.

To implement this feature, we'll need a way for the environment to hold variables in the current scope as well as variables set in enclosing scopes. Our current implementation of the environment using a plain JavaScript object won't cut it. // TODO: Change the initial implementation to use a Map

We'll create a class `Environment` with fields for the variables and the enclosing environment.

```js
class Environment {
  constructor(params = [], args, enclosing) {
    this.values = new Map();
    this.enclosing = enclosing;

    // sets the initial bindings in the environment
    params.forEach((param, i) => {
      this.values.set(param.lexeme, args[i]);
    });
  }
}
```

To define a variable in the environment, we'll set its value in the `values` map:

```js
define(name, value) {
  this.values.set(name, value);
}
```

To set a variable, we'll check if the variable is defined in the environment or in an enclosing environment, and set its value there. If we're at the global scope and we still can't find the variable defined there, we'll throw a `RuntimeError`.

```js
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
```

Similary, to get the value of a variable, we'll check the environment as well as its enclosing environments.

```js
get(name) {
  if (this.values.has(name)) {
    return this.values.get(name);
  }
  if (this.enclosing) {
    return this.enclosing.get(name);
  }
  throw new RuntimeError(`Unknown identifier: ${name}`); 
}
```

// IMAGE of get define and set probably.

The parser grammar for `let` is as follows:

```text
let         => "(" "let" "(" let-binding* ")" expression* ")"
let-binding => "(" SYMBOL expression ")"
```

In the parser:

```js
let() {
  this.advance(); // move past the "let" token
  this.consume(TokenType.LeftBracket);
  
  const bindings = [];
  while (!this.match(TokenType.RightBracket)) {
    bindings.push(this.letBinding());
  }
  
  const body = [];
  while (!this.match(TokenType.RightBracket)) {
    bindings.push(this.expression());
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
//   constructor(bindings, body) {/* ... */}
// }

// class LetBindingNode {
//   constructor(name, value) {/* ... */}
// }
```

Finally, in the `Interpreter`, when we see a `LetExpr`, we'll get the variable names and values from the bindings. Then, we'll create a new `Environment` with the current environment as its enclosing environment, after which we'll evaluate all the expressions in the body **within the new environment** and return the result.

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

> Image of environment with enclosing pointing to 

> TODO: Add link to this article in the article on pointers that talked about enclosing environments.

## Lambdas

In this section, we'll add a final construct to our interpreter. We've come a long way by this point. The interpreter can evaluate simply expressions and use and modify both local and global state. But the interpreter is still pretty much a calculator. To improve it to a real programming language interpreter, we'll need a way to store a set of operations to be executed when needed. This construct, similar to a function in other languages, is called the `lambda` in Scheme.

Lambdas in Scheme support zero or more arguments and a set of expressions in the body of the lambda. Like `let`, it evaluates all the expressions in the body and then returns the result of the final expression. Lambdas are also *first-class objects*: meaning they can be assigned to variables like other data types; a lambda can be passed as an argument into another lambda or procedure, etc.

```scheme
(define square
  (lambda (n)
    (display "square was called")
    (* n n)))
(square 3) ; prints "square was called", returns 9

(procedure? square) ; #t
```

Lambdas in Scheme also have closures. They "hang on" to the environment in which they were defined and can access and modify the environment when called later.

```scheme
(define increment-generator
  ;; returns a lambda which when called returns
  ;; the next increment
  (lambda ()
    (let ((n 0))
      (lambda ()
        (set! n (+ n 1))
        n))))

(define next-increment (increment-generator))
(next-increment) ; 1
(next-increment) ; 2
(next-increment) ; 3
```

The parser grammar rule for a lambda may be written as:

```text
...
expression => if | call | define | lambda | atom
lambda     => "(" "lambda" "(" SYMBOL* ")" expression* ")"
...
```

To translate that into code in the parser:

```js
expression() {
  // ... if (token.lexeme === 'define') return this.define();
  if (token.lexeme === 'lambda') return this.lambda();
	// ...
}

lambda() {
  this.advance(); // move past the "lambda" token
  
  const params = [];
  this.consume(TokenType.LeftBracket);
  while (!this.match(TokenType.RightBracket)) {
    const param = this.consume(TokenType.Symbol);
    params.push(param);
  }
  
  const body = [];
  while (!this.match(TokenType.RightBracket)) {
    const expression = this.expression();
    body.push(expression);
  }
  
  return new LambdaExpr(params, body);
}

// class LambdaExpr extends Expr {
// 	constructor(params, body) { ... }
// }
```

In the interpreter, when we encounter a `LambdaExpr` node, we'll create and return a new `Procedure` object. The procedure holds the lambda's declaration as well as the current environment as its closure.

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

Next, we'll update what happens when a `CallExpr` is interpreted. Remember that a call expression looks like `(proc arg1)` , where `proc` is a built-in procedure or a lambda.

```js
interpret(expr, env) {
  // ...
  if (expr instanceof CallExpr) {
    const callee = this.interpret(expr.callee, env);
    const args = expr.args.map((arg) => this.interpret(arg, env));
    
    // Call user-defined procedures
    if (callee instanceof Procedure) {
      return callee.call(this, args);
    }
    
    // Call built-in procedures
    if (callee instanceof Function) {
      return callee(args);
    }
    throw new RuntimeError(`Cannot call ${callee}`);
  }
  // ...
}
```

When the procedure in the call expression is a `Procedure` object, we call a `call` method on the object, passing in `this` (the interpreter instance) and the evaluated arguments.

In `call`, we'll create a new environment for the lambda call, setting the lambda's parameters to the values of the call arguments, and setting the lambda's closure as the enclosing environment. Then, we interpret the expressions in the body of the lambda and return the result of the final expression.

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

## Eliminating tail calls

We have a fully-fledged Scheme interpreter now that supports declaring and calling lambda expressions. But a careful reader may have noticed that we did not implement a rather popular programming language feature in this interpreter: the loop.

Well, that's because we don't quite *need* a loop procedure. Looping in Scheme is typically done through recursion—and our interpreter already supports that as it is! For example:

```scheme
(define sum-to
  (lambda (n)
    (define sum-to-recur
      (lambda (n, acc)
        (if (= n 0)
            acc
            (sum-to-recur (- n 1) (+ n acc)))))
    (sum-to-recur n 0)))

(sum-to 1)   ; 1
(sum-to 2)   ; 3
(sum-to 3)   ; 6
(sum-to 100) ; 5050
```

This is, or at least should be, equivalent to the following JavaScript code:

```text
function sum-to(n):
	sum = 0
	loop with i from 1 to (n + 1):
		sum = sum + i
  return sum
```

But when we pass a very large number into the Scheme function, unlike in the pseudocode, we see the following error from the interpreter:

```js
RangeError: Maximum call stack size exceeded
```

To make tail-recursive procedures equivalent to loop, we need to implement a go-to like behaviour in the interpreter.

Pseudocode for recursive function:

```text
function sum-to-recur(n, acc):
	if n = 0 then
	return acc
else
	return sum-to-recur(n - 1, acc + n)
```

When a recursive call is done in the tail position, i.e. the procedure ends by returning the value of the recursive call. Then keeping the caller's frame on the stack is a waste of memory because there's nothing left to do once the recursive call completes.

The third issue is that each recursive call adds a new frame to the [call stack](https://en.wikipedia.org/wiki/Call_stack), and each frame reserves additional memory for local variables and input arguments.

**<https://www.geoffreylitt.com/2018/01/15/adding-tail-calls-optimization-to-a-lisp-interpreter.html>**

In tail call we still evaluate all the args, but not the function call itself.

**Notice that we make a function call to `EVAL` as part of evaluating a conditional.** This allocates a new stack frame every time we evaluate a conditional…hence the stack overflow when we recursively evaluate hundreds of them. To solve this we need to find a way to avoid allocating a new stack frame every time we evaluate a conditional.

We can use goto, link my article here. But we can just use while.

## Scratch

- **Further**:
  - Symbols
  - "''", ",", ",@" Macros
    - https://www.shido.info/lisp/scheme_syntax_e.html
  - String representations of the classes
  - Call with current continuation: <https://www.cs.rpi.edu/academics/courses/fall00/ai/scheme/reference/schintro-v14/schintro_141.html#SEC265>

Formal syntax of Schemeu. To learn how to read it, see my article on [ambiguous grammars](https://chidiwilliams.com/post/ambiguous-grammars/).

- Racket docs: <https://docs.racket-lang.org/reference/strings.html#%28def>._%28%28quote._~23~25kernel%29.\_string%29%29

**Questions**

- How do I know when a language is Turing-complete? Is the language we implement by the end of this essay going to be Turing-complete?
- Reimplement
- A few exercises the reader can try... Add an arity to the definition of a procedure which would be checked before the function is called
