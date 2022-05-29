---
title: 'On Recursive Descent and Pratt Parsing'
date: 2022-05-29T11:15:47+01:00
draft: true
---

In this essay, we'll discuss two different techniques for parsing expressions: recursive descent parsing and Pratt parsing. We'll write two parsers highlighting each technique, and both will be able to parse an expression language called [Covey](https://github.com/chidiwilliams/covey/).

Covey supports simple expressions with arithmetic operations (plus, minus, multiplication, division), conditional operations with a ternary operator, identifiers (or what you might call a variable, in a full programming language), and a negation operation.

In this post, we'll only cover the implementation of the parser for the sake of comparison. For a full understanding of how scanners and interpreters might look like, see [Building an Expression Evaluator](https://chidiwilliams.com/post/evaluator/) and [How to Write a Lisp Interpreter in JavaScript](https://chidiwilliams.com/post/how-to-write-a-lisp-interpreter-in-javascript/).

**Parsers**

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

**Pratt parsing**

- Pratt parsing is basically a type of shunting yard, which is something I've used in a previous post
  - The algorithm employs two stacks to resolve the precedence dilemmas of infix notation. One stack is for storing operators of relatively low precedence that await results from computations with higher precedence. The other stack keeps the result accumulated so far. The result can either be a RPN expression, an AST or just the computed result (a number) of the computation.
  - Here's a big advantage of this hybrid parser: adding new expressions and/or changing precedence levels is much simpler and requires far less code. In the pure RD parser, the operators and their precedences are determined by the structure of recursive calls between methods. Adding a new operator requires a new method, as well as modifying some of the other methods [[2\]](https://eli.thegreenplace.net/2009/03/20/a-recursive-descent-parser-with-an-infix-expression-evaluator#id5). Changing the precedence of some operator is also troublesome and requires moving around lots of code.
- https://eli.thegreenplace.net/2009/03/20/a-recursive-descent-parser-with-an-infix-expression-evaluator
- https://www.engr.mun.ca/~theo/Misc/exp_parsing.htm

Benchmarks: with the TS implementation, Pratt is much slower by a large margin, but I tried reimplementing with Go, and I changed the map of token types to parse rules to an array and Pratt is only about 1.3
