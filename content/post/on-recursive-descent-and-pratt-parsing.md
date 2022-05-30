---
title: 'On Recursive Descent and Pratt Parsing'
date: 2022-05-29T11:15:47+01:00
draft: true
---

In this essay, we'll discuss two different techniques for parsing expressions: recursive descent parsing and Pratt parsing. We'll write two parsers highlighting each technique, and both will be able to parse an expression language called [Covey](https://github.com/chidiwilliams/covey/).

Covey supports simple expressions with arithmetic operations (plus, minus, multiplication, division), conditional operations with a ternary operator, identifiers (or what you might call a variable, in a full programming language), and a negation operation.

In this post, we'll only cover the implementation of the parser for the sake of comparison. For a full understanding of how scanners and interpreters might look like, see [Building an Expression Evaluator](https://chidiwilliams.com/post/evaluator/) and [How to Write a Lisp Interpreter in JavaScript](https://chidiwilliams.com/post/how-to-write-a-lisp-interpreter-in-javascript/).

## Parsers

The goal of the Covey parser is to take a list of pre-scanned tokens representing the source expression and convert it into a parse tree. For example:

```text
expression = "1 + 3 * 9 - 43"
tokens = [1, +, 3, *, 9]
tree = (- (+ 1 (* 3 9)) 43)
```

[[TREE ANIMATION]]

The resulting parse tree can then be interpreted by walking from the leaf nodes to the top of the tree to get the final result. But we won't be implementing an interpreter in this post.

When implementing the parser, we need to keep the precedence of operations in mind. The resulting parse tree needs to match the evaluation order of the operations. Operations that should be carried out first are at the bottom of the tree, the leaf nodes, while the one to be carried out later are at the bottom of the tree. In the previous example, for example, even though "1 + 3" appeared first in the expression, the operation "3 + 9" is to be carried out first, and hence is at the bottom of the parse tree.

It's also worth taking note of the concept of associativity. Operators like +, -, /, \*, are left-associative, while - (unary) and ternary operators are right-associative.

```text
1 + 2 + 3         => ((+ 1 2) 3)
8 * 3 * 9         => ((* 8 3) 9)
- - - 3           => (- (- (- 3)))
1 ? 2 : 3 ? 4 : 5 => (?: 1 2 (?: 3 4 5))
```

Formal grammar is a way of representing the syntactic structure of a language. It shows [all the possible ways of producing valid statements in the language](https://chidiwilliams.com/post/ambiguous-grammars/).

We may specify the formal grammar for Covey as:

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

According to this specification, an _expression_ can be any of a unary, binary, or ternary operation on _primary_ or a nested _expression_.

However, this grammar falls into the trap we mentioned earlier. It specifies what operations are possible, but not what their precedence. A parser that tries to implement this grammar will not be able to distiguish.

According to this grammar, the expression `1 + 2 * 3`, the parser is unable to tell whether to parse it in two ways:

If it parses "1" as a _primary_ and then on seeing "+", it parses an "expression + expression", making "1 + 2". Then it parses another _expression_ as a primary, making `(* (+ 1 2) 3)`.

Alternatively, after parsing "1" as a primary, it may then parse "2 _ 3" as an "expression _ expression", making `(+ 1 (* 2 3))`. Which is the correct parse tree.

Parsers that are unable to make up their mind about the production of a given set of tokens are called ambiguous (link to ambiguous grammars post.)

We may redefine the grammar to be less ambiguous by specifying the precedence within the grammar itself:

```text
expression => ternary
ternary    => term ( "?" ternary ":" ternary )?
term       => factor ( ( "-" | "+" ) factor )*
factor     => unary ( ( "*" | "/" ) unary )*
unary      => ( "-" ) unary | primary
primary    => NUMBER | IDENTIFIER
```

An *expression* is a *ternary*. A *ternary* is a *term*, which may be followed by the rest of a ternary expression; because ternary expressions are right-associative, the then and else branches of the ternary may themselves be ternary expressions. A *term* is a *factor* followed by zero or more *factor*-s separated by a "-" or "+". A *factor* is a *unary* followed by one or more *unary*-s separated by "*" or "/". A *unary* is a "-" followed by a *unary* (hence its right-associativity); or a *primary*. Finally, as before, a *primary* is a number of an identifier.

In this grammar, each rule defines how to parse an expression with at least the precedence of that rule. For example, the *ternary* rule parses an expression with a precedence equal to or higher than a *ternary* expression. The *unary* rule parses an expressions with a precedence equal to or higher than a *unary* expression, and so on.

Taking the previous example, "1 + 2 * 3": we walk through the grammar from top to bottom to parse the expression. After getting to the "1 +" in the tokens, we match a *term* expression: a *factor* followed by another *factor*. We match the "1" as a NUMBER, and then the "2 * 3" as a *unary* followed by a "*" and another *unary*. Hence, unlike the previous grammar, this grammar produces only one interpretation of the expression, the correct one: `(+ 1 (* 2 3))`.

## Recursive descent parsing

The system we've just used to manually parse the expression *is* recursive descent parsing. In this technique, we walk down from the top of the language grammar to the bottom, and try to apply each production rule to match the tokens. We'll implement a set of recursive functions to implement, where each one implements one of the non-terminals of the grammar.

To parse a *ternary*, we'll parse a *term*, and then if a question mark follows, we'll parse the rest of the ternary expression and return a conditional expression:

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

To parse a *term*, we'll parse a *factor*. And while there are subsequent "-" or "+" tokens, we'll parse the other operands to make binary expressions from left to right.

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

To parse a *factor*, we'll parse a *unary*. And while there are subsequent "/" or "*" tokens, we'll parse the other operands to make binary expressions from left to right.

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

To parse a *unary*, we'll check if the next token a unary operator, like a "!" or "-". If it is, we'll parse a *unary* and return a unary expression. But if it isn't, we'll parse a *primary*.

```ts
private unary(): Expr {
  if (this.match(TokenType.BANG, TokenType.MINUS)) {
    const operator = this.previous();
    const expression = this.unary();
    return new UnaryExpr(operator, expression);
  }
  return this.primary();
}
```

Finally, to parse a *primary*, we'll check if the current token is a number or an identifier, and return a literal expression or a variable expression respectively.

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

To parse a given expression, we'll start with the lowest precedence rule, *ternary*:

```ts
parse(): Expr {
  return this.ternary();
}
```

## Pratt parsing

That's one way to parse expression, but Pratt describes a different algorithm for parsing expressions.

In Pratt parsing, we describe every expression as consisting of an *prefix*, followed by zero or more *infix*-es of the same or higher precedence. A *prefix* can be a number, a variable, or a *unary*, where a *unary* is a unary token (e.g. "-"), followed by an expression with a precedence of at least UNARY. An *infix* can be a binary (e.g. "+", "-", "/", "*") or a ternary expression ("?:"). The right operand of a binary expression has a precedence greater than that of the expression's operator. Also, the then and else branches of a ternary expression both have precedences of at least TERNARY.

This is how we would parse the expression `- age + 23 / 5 - 10` using Pratt parsing:

- At first, we start parsing with the lowest precedence, TERNARY
- Parse the *prefix* of the expression. The next token is a "-", so we parse a *unary*. The *unary* matches the "-" token and then recursively parses using a precedence of UNARY.
  - The *prefix* of this expression is "age", a variable expression; and there are no *infixes* with a precedence of at least UNARY.
- The next token, "+", has a higher precedence than TERNARY, so we parse an *infix*. "+" matches a binary expression, where the left operand is the unary expression we've just parsed, `(- age)`. To get the right operand, we continue parsing with a precedence of TERM+1, i.e. one higher than the precedence of the operator, "+".
  - This parsing produces an *prefix*, `23`. And, since the precedence of "/", FACTOR, is at least the precedence of TERM+1, we parse an *infix*. "/" matches a binary expression, where the left operand is the prefix, `23`, and the right operand is the result of parsing with a precedence of FACTOR+1.
    - This parsing in turn has a *prefix* of *5* and no *infix*es, as the next operator "-" has a precedence less than FACTOR+1.
- The next token, "-", also has a higher precedence than TERNARY, so we parse another *infix*. Again, "-" matches a binary expression, where the left operand is the result of the previous *infix*, `(+ (- age) (/ 23 5))`, and the right operand is the result of parsing with a precedence of TERM+1.
  - Parsing the right operand results in a *prefix*, `10`, followed by no infixes, as there are no tokens left to parse.
- The result parse tree becomes `(- (+ (- age) (/ 23 5)) 10)`

A previous reader of this blog might note that this algorithm is somewhat similar to the Dijkstra shunting yard algorithm implemented in [Building an Expression Evaluator](https://chidiwilliams.com/post/evaluator/#converting-from-infix-to-rpn).

We'll define a type, `ParseRule`, that defines the precedence of a token type as well as the functions to be used to parse it as a *prefix* or *infix*.

```ts
// Operator precedence from lowest (top) to highest (bottom)
enum Precedence {
  NONE,
  TERNARY,
  TERM,
  FACTOR,
  UNARY,
}

type PrefixParseFn = () => Expr;

type InfixParseFn = (left: Expr) => Expr;

interface ParseRule {
  prefix?: PrefixParseFn;
  infix?: InfixParseFn;
  precedence: Precedence;
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

`parsePrecedence` parses the *prefix* expression according to the parse rule of the next token. Then, while the next tokens have a precedence greater than or equal to the given precedence, we parse *infix* expressions to make up the final result.

Next, we'll define the rules for each token type:

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

For the prefix parsing functions, `number` parses a literal expression containing a number:

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

And `unary` parses a unary expression:

```ts
private unary: PrefixParseFn = () => {
  const operator = this.previous();
  const operand = this.parsePrecedence(Precedence.UNARY);
  return new UnaryExpr(operator, operand);
};
```

Then for the infix parsing functions, `binary` parses a binary expression:

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

To kick off parsing, we'll call `parsePrecedence` with the lowest precedence, `TERNARY`.

```ts
parse(): Expr {
  return this.parsePrecedence(Precedence.TERNARY);
}
```

## Comparison



- Pratt parsing is basically a type of shunting yard, which is something I've used in a previous post
  - Here's a big advantage of this hybrid parser: adding new expressions and/or changing precedence levels is much simpler and requires far less code. In the pure RD parser, the operators and their precedences are determined by the structure of recursive calls between methods. Adding a new operator requires a new method, as well as modifying some of the other methods [[2\]](https://eli.thegreenplace.net/2009/03/20/a-recursive-descent-parser-with-an-infix-expression-evaluator#id5). Changing the precedence of some operator is also troublesome and requires moving around lots of code.
- https://eli.thegreenplace.net/2009/03/20/a-recursive-descent-parser-with-an-infix-expression-evaluator
- https://www.engr.mun.ca/~theo/Misc/exp_parsing.htm

Benchmarks: with the TS implementation, Pratt is much slower by a large margin, but I tried reimplementing with Go, and I changed the map of token types to parse rules to an array and Pratt is only about 1.3

According to the Wikipedia page on Operator precedence parsing, recursive descent can become inefficient when parsing. Parsing a number requires five function calls, one for each non-terminal in the grammary until reaching primary.



With object:

```text
Input: 1 + 3 - 5
Recursive Descent x 4,220,448 ops/sec ±1.04% (94 runs sampled)
Pratt x 837,369 ops/sec ±4.85% (67 runs sampled)

Input: - 1 + 23 * 4 + age + 4 ? 5 : 9 * height / 5 + 2
Recursive Descent x 1,042,365 ops/sec ±0.23% (94 runs sampled)
Pratt x 489,539 ops/sec ±3.06% (80 runs sampled)

Input: 2 / 89 + 37 ? 9 : 17 * 90 - 3 + 7 / 1 - - 4 + 89 * 3 + 1 + 9 - 47 - - 9 + 2 ? 4 : 37 * 9 + 0 / 21 + 8 - 9 - 2 / 4
Recursive Descent x 395,567 ops/sec ±5.03% (89 runs sampled)
Pratt x 264,563 ops/sec ±2.77% (88 runs sampled)
```

With array:

```text
Input: 1 + 3 - 5
Recursive Descent x 4,718,156 ops/sec ±0.34% (94 runs sampled)
Pratt x 1,005,622 ops/sec ±9.43% (57 runs sampled)

Input: - 1 + 23 * 4 + age + 4 ? 5 : 9 * height / 5 + 2
Recursive Descent x 1,098,175 ops/sec ±0.96% (91 runs sampled)
Pratt x 789,713 ops/sec ±5.21% (67 runs sampled)

Input: 2 / 89 + 37 ? 9 : 17 * 90 - 3 + 7 / 1 - - 4 + 89 * 3 + 1 + 9 - 47 - - 9 + 2 ? 4 : 37 * 9 + 0 / 21 + 8 - 9 - 2 / 4
Recursive Descent x 450,167 ops/sec ±0.26% (95 runs sampled)
Pratt x 490,550 ops/sec ±3.64% (83 runs sampled)
```

