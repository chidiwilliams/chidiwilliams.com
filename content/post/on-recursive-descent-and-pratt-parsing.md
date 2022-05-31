---
title: 'On Recursive Descent and Pratt Parsing'
date: 2022-05-31T00:15:47+01:00
draft: true
---

In this essay, we'll discuss two techniques for parsing expressions: recursive descent parsing and Pratt parsing.

We'll implement both parsers for a small expression language, **[Covey](https://github.com/chidiwilliams/covey)**, that supports addition, multiplication, subtraction, division, unary negation, and ternary expressions on numbers and identifiers.

We'll only cover the implementations of the parsers here to compare the recursive descent and Pratt parsing schemes. For the implementation of a complete expression evaluator, see [Building an Expression Evaluator](https://chidiwilliams.com/post/evaluator/) and [How to Write a Lisp Interpreter in JavaScript](https://chidiwilliams.com/post/how-to-write-a-lisp-interpreter-in-javascript/).

## Parsers

An expression parser accepts a list of tokens representing an expression and converts it into a _parse tree_. (An evaluator may then traverse this tree recursively to produce the final result.)

```text
Expression: [1, +, 3, *, 9, -, 43]
Parse tree:
-
├── +
│   ├── 1
│   └── *
│       ├── 3
│       └── 9
└── 43
```

Notice that the structure of the parse tree matches the order of evaluation of the expression. The sub-expressions to be evaluated first are lower down the tree than the ones to be evaluated last. Even though the sub-expression `1 + 3` appears first in the input expression, `3 * 9` has a higher precedence (remember [BODMAS](https://simple.wikipedia.org/wiki/Order_of_operations)?) and so is at the bottom of the parse tree.

Besides precedence, parsers also need to handle operator associativity. Operators like `+`, `-` (subtraction), `/`, and `*` are left-associative, while `-` (unary negation) and ternary operators are right-associative.

```text
1 + 2 + 3         => ((1 + 2) + 3)
8 * 3 * 9         => ((8 * 3) * 9)
- - - 3           => (- (- (- 3)))
1 ? 2 : 3 ? 4 : 5 => (1 ? 2 : (3 ? 4 : 5))
```

An expression parser also works according to the **formal grammar** of the language, which specifies all the possible ways of producing valid expressions in the language.

For example, we may define the formal grammar for Covey as:

```text
expression => ( "-" expression ) |
              ( expression "+" expression ) |
              ( expression "-" expression ) |
              ( expression "/" expression ) |
              ( expression "*" expression ) |
              ( expression "?" expression ":" expression ) |
              primary
primary    => NUMBER | IDENTIFIER
```

According to this grammar, an _expression_ can be a unary, binary, or ternary operation on a _primary_ or a nested _expression_.

Hence all of the following are valid expressions:

```text
3          => expression -> primary -> NUMBER
4 / 2      => expresssion "/" expression (each operand is
              parsed as expression -> primary -> NUMBER)
7 + 2 + 9  => expression "+" expression (first operand is
              parsed as expression "+" expression; second
              operand is parsed as NUMBER)
...and so on...
```

This grammar describes valid expressions, but it doesn't account for operator precedence. According to the grammar, the expression `1 + 2 * 3` can be parsed in _either_ of two ways:

1. As `expression "+" expression`, where the first expression is a `NUMBER`, `1`, and the other is an `expression "*" expression`, representing `2 * 3`.
2. As `expression "*" expression`, where the first `expression` is an `expression "+" expression`, representing `1 + 2`, and the other is a `NUMBER`, 3.

Both of those productions are possible according to the formal grammar. But only the first is correct according to precedence rules.

To bake precedence into the grammar, we can rewrite the production rules as follows:

```text
expression => ternary
ternary    => term ( "?" ternary ":" ternary )?
term       => factor ( ( "-" | "+" ) factor )*
factor     => unary ( ( "*" | "/" ) unary )*
unary      => ( "-" ) unary | primary
primary    => NUMBER | IDENTIFIER
```

In this grammar:

- An _expression_ is a _ternary_.
- A _ternary_ is a _term_, which may be followed by the rest of a ternary expression. Because ternaries are right-associative, the "then" and "else" branches of the ternary are _ternary_-s.
- A _term_ is a _factor_ followed by zero or more *factor*s separated by a `"-"` or a `"+"`.
- A _factor_ is a _unary_ followed by one or more _unary_-s separated by a `"*"` or a `"/"`.
- A _unary_ is a _primary_ or a `"-"` followed by a _unary_.
- A _primary_ is a `NUMBER` or an `IDENTIFIER`.

This version of the grammar removes the ambiguity we discussed earlier. The expression `1 + 2 * 3` now has only one interpretation: a `factor "+" factor`, where the first `factor` is a `NUMBER` and the second is a `NUMBER "*" NUMBER`.

## Recursive descent parsing

The technique we used in the previous section to parse an expression by applying the grammar rules from top to bottom is called _recursive descent_. To implement a recursive descent parser, we define a set of recursive functions, each of which implements one of the non-terminals of the grammar.

To parse a _ternary_, we parse a _term_. Then if a question mark follows, we parse the rest of the ternary expression and return a conditional expression:

```ts
private ternary(): Expr {
  let expression = this.term();

  if (this.match(TokenType.QUESTION_MARK)) {
    const thenBranch = this.ternary();
    this.consume(TokenType.COLON, 'Expect colon after ternary condition.');
    const elseBranch = this.ternary();
    return new ConditionalExpr(expression, thenBranch, elseBranch);
  }

  return expression;
}
```

To parse a _term_, we parse a _factor_. While there are subsequent `"-"` or `"+"` tokens, we'll parse another _factor_ to make binary expressions from left to right.

```ts
private term(): Expr {
  let expression = this.factor();

  while (this.match(TokenType.MINUS, TokenType.PLUS)) {
    const operator = this.previous();
    const right = this.factor();
    expression = new BinaryExpr(expression, operator, right);
  }

  return expression;
}
```

To parse a _factor_, we parse a _unary_. While there are subsequent `"/"` or `"*"` tokens, we'll parse another _unary_ to make binary expressions from left to right.

```ts
private factor(): Expr {
  let expression = this.unary();

  while (this.match(TokenType.SLASH, TokenType.STAR)) {
    const operator = this.previous();
    const right = this.unary();
    expression = new BinaryExpr(expression, operator, right);
  }

  return expression;
}
```

To parse a _unary_, we first check if the next token is a unary operator, `"-"`. If it is, we parse a _unary_ and return a unary expression. But if it isn't, we parse a _primary_.

```ts
private unary(): Expr {
  if (this.match(TokenType.MINUS)) {
    const operator = this.previous();
    const expression = this.unary();
    return new UnaryExpr(operator, expression);
  }
  return this.primary();
}
```

Finally, to parse a _primary_, we check if the current token is a number or an identifier and return a literal or variable expression respectively.

```ts
private primary(): Expr {
  switch (true) {
    case this.match(TokenType.NUMBER):
      return new LiteralExpr(this.previous().literal!);
    case this.match(TokenType.IDENTIFIER):
      return new VariableExpr(this.previous());
    default:
      throw new ParseError(this.peek(), 'Expect expression.');
  }
}
```

To parse any given expression, we start with the lowest precedence rule, _ternary_:

```ts
parse(): Expr {
  return this.ternary();
}
```

## Pratt parsing

Pratt parsing describes an alternative way of parsing expressions. Here's how it works:

To parse an expression: we parse a _prefix_ followed by zero or more _infixes_ at the same or higher precedence. A _prefix_ is a number, an identifier, or a _unary_. (A _unary_ is a unary token, such as `"-"`, followed by an expression with a precedence of at least `UNARY`.)

And an _infix_ is a binary or a ternary expression. If the _infix_ is a binary expression, the result of the previous _prefix_ parsing is the left operand. To get the right operand, we parse the next sub-expression at a precedence at least one higher than the the binary operator. If the _infix_ is a ternary expression, the result of the _prefix_ parsing is the ternary condition. To get the then- and else-branches, we parse the next sub-expression at a precedence of at least `TERNARY`.

Let's take an example. To parse the expression `- age + 23 / 5 - 10`:[^slc]

[^slc]: This algorithm is similar to the stack-based shunting yard algorithm implemented in [Building an Expression Evaluator](https://chidiwilliams.com/post/evaluator/#converting-from-infix-to-rpn).

- Start parsing with the lowest precedence, `TERNARY`
- Parse the _prefix_. The next token is `"-"` which matches a _unary_. To get the unary operand, we (recursively) parse with a precedence of `UNARY`.
  - Parse the _prefix_. The next token is `age` which results in a variable expression.
  - The next token, `"+"`, has a lower precedence than `UNARY`, so we have no *infix*es to parse.
  - Result: `(- age)`
- The next token, `"+"`, has a higher precedence than `TERNARY`, so we parse an _infix_. `"+"` matches a binary expression; the left operand is the result of the previous _prefix_ parsing: `(- age)`. To get the right operand, we (recursively) parse with a precedence of `TERM + 1`.
  - Parse the _prefix_. The next token is `23`, resulting in literal expression.
  - The next token, `"/"`, has a precedence, `FACTOR`, equal to `TERM + 1`. So we parse an _infix_. `"/"` matches a binary expression. The left operand is `23`, the result of the previous _prefix_ parsing. And to get the right operand, we (recursively) parse with a precedence of `FACTOR + 1`, getting `5`.
  - Result: `(+ (- age) (/ 23 5))`
- The next token, `"-"`, also has a higher precedence than `TERNARY`. So we parse another _infix_. `"-"` matches a binary expression. The left operand is the result of the previous _infix_ parsing: `(+ (- age) (/ 23 5))`. To get the right operand, we (recursively) parse with a precedence of `TERM + 1`, getting `10`.
- The final parse tree becomes `(- (+ (- age) (/ 23 5)) 10)`

To implement the parser, we'll first define a type, `ParseRule`, that specifies the precedence of a token type and the functions to be used to parse it as a _prefix_ or an _infix_.

```ts
enum Precedence {
  NONE, // lowest
  TERNARY,
  TERM,
  FACTOR,
  UNARY, // highest
}

type PrefixParseFn = () => Expr;

type InfixParseFn = (left: Expr) => Expr;

interface ParseRule {
  precedence: Precedence;
  prefix?: PrefixParseFn;
  infix?: InfixParseFn;
}
```

Next, we'll implement the method that parses an expression at a given precedence:

```ts
private parsePrecedence(precedence: Precedence): Expr {
  const nextToken = this.advance();
  const prefixRule = this.getRule(nextToken.tokenType).prefix;
  if (!prefixRule) {
    throw new Error('Expect expression.');
  }

  let expression = prefixRule();

  while (this.getRule(this.peek().tokenType).precedence >= precedence) {
    const nextToken = this.advance();
    const infixRule = this.getRule(nextToken.tokenType).infix!;
    expression = infixRule(expression);
  }

  return expression;
}
```

`parsePrecedence` parses the next _prefix_ expression according to the parse rule of the next token. Then, while the next tokens have a precedence greater than or equal to the given precedence, it parses subsequent _infix_ expressions to make up the final result.

Next, we'll write the method that returns the parse rule for a token type:

```ts
private parseRules: ParseRule[] = [
  { infix: this.binary, precedence: Precedence.TERM }, // PLUS
  { prefix: this.unary, infix: this.binary, precedence: Precedence.TERM }, // MINUS
  { prefix: this.unary, precedence: Precedence.NONE }, // BANG
  { prefix: this.number, precedence: Precedence.NONE }, // NUMBER
  { precedence: Precedence.NONE }, // EOF
  { infix: this.binary, precedence: Precedence.FACTOR }, // STAR
  { infix: this.binary, precedence: Precedence.FACTOR }, // SLASH
  { infix: this.ternary, precedence: Precedence.TERNARY }, // QUESTION_MARK
  { precedence: Precedence.NONE }, // COLON
  { prefix: this.variable, precedence: Precedence.NONE }, // IDENTIFIER
];

private getRule(tokenType: TokenType): ParseRule {
  return this.parseRules[tokenType]!;
}
```

`number` parses a literal expression containing a number:

```ts
private number: PrefixParseFn = () => {
  return new LiteralExpr(this.previous().literal!);
};
```

`variable` parses a variable expression:

```ts
private variable: PrefixParseFn = () => {
  return new VariableExpr(this.previous());
};
```

`unary` parses a unary expression:

```ts
private unary: PrefixParseFn = () => {
  const operator = this.previous();
  const operand = this.parsePrecedence(Precedence.UNARY);
  return new UnaryExpr(operator, operand);
};
```

`binary` parses a binary expression:

```ts
private binary: InfixParseFn = (left: Expr) => {
  const operator = this.previous();
  const rule = this.getRule(operator.tokenType);
  const right = this.parsePrecedence(rule.precedence + 1);
  return new BinaryExpr(left, operator, right);
};
```

And `ternary` parses a ternary expression:

```ts
private ternary: InfixParseFn = (left: Expr) => {
  const thenBranch = this.parsePrecedence(Precedence.TERNARY);
  this.consume(TokenType.COLON, 'Expect colon after ternary condition.');
  const elseBranch = this.parsePrecedence(Precedence.TERNARY);
  return new ConditionalExpr(left, thenBranch, elseBranch);
};
```

To kick off parsing, we'll call `parsePrecedence` with the lowest precedence: `TERNARY`.

```ts
parse(): Expr {
  return this.parsePrecedence(Precedence.TERNARY);
}
```

## Comparison and benchmarks

While both parsers can parse any valid expression in the language, they differ in terms of implementation, extensibility, and performance. The structure of the recursive descent parser closely mirrors the formal grammar of the language. And so it may be easier to implement than the Pratt parser which requires knowledge of a special algorithm.

On the other hand, since the Pratt parser defines all the operations and rules in a single table, it is easier to extend than the recursive descent parser. To add a new operator or change the precedence of an operator, one only has to update the parsing rules. But the same task in the recursive descent parser will require adding new methods and changing existing methods.[^sdk]

[^sdk]: It's possible to combine both parsing methods. In a parser for a programming language with statements and expressions, we can use a hybrid scheme: recursive descent parsing for the statements and Pratt parsing for the expressions.

I ran [some benchmarks](https://github.com/chidiwilliams/covey/blob/main/src/benchmarks.ts) to compare the Recursive Descent and Pratt parsers and found that for a short expression (two binary operations) the recursive descent parser was about 3.4x faster than the Pratt parser. For a longer expression (two unary, twenty-one binary, and two ternary operations), the recursive descent parser was about 0.1x faster.

After some profiling, I noticed that a decent amount of overhead in the Pratt parsing happened during the initialization of the `PrattParser` object. And so, at the cost of a little less readability, I [moved the parse functions outside the `PrattParser` class definition](https://github.com/chidiwilliams/covey/blob/main/src/optimized-pratt-parser.ts). After this optimization, the Pratt parser was about 0.7x faster than the recursive descent parser for the short and long expressions.

```text
Input: 1 + 3 - 5
Recursive Descent x 4,825,141 ops/sec ±0.26% (94 runs sampled)
Pratt x 1,106,515 ops/sec ±4.38% (64 runs sampled)
Optimized Pratt x 8,263,421 ops/sec ±0.35% (94 runs sampled)

Input: - 1 + 23 * 4 + age + 4 ? 5 : 9 * height / 5 + 2
Recursive Descent x 1,121,539 ops/sec ±0.22% (97 runs sampled)
Pratt x 812,288 ops/sec ±5.69% (71 runs sampled)
Optimized Pratt x 2,172,998 ops/sec ±0.24% (96 runs sampled)

Input: 2 / 89 + 37 ? 9 : 17 * 90 - 3 + 7 / 1 - - 4 + 89 * 3 + 1 + 9 - 47 - - 9 + 2 ? 4 : 37 * 9 + 0 / 21 + 8 - 9 - 2 / 4
Recursive Descent x 450,890 ops/sec ±0.26% (90 runs sampled)
Pratt x 490,240 ops/sec ±5.28% (80 runs sampled)
Optimized Pratt x 778,055 ops/sec ±0.27% (93 runs sampled)
```

The complete implementation of the parsers is available [on GitHub](https://github.com/chidiwilliams/covey/blob/main/src/parser.ts).
