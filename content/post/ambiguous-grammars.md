---
title: 'Ambiguous Grammars'
date: 2022-02-12T16:27:55Z
draft: false
---

**I.**

I've recently been learning about programming languages, parsers, and interpreters—mainly by [reading Bob Nystrom's _Crafting Interpreters_](https://chidiwilliams.com/post/notes-on-crafting-interpreters-go/). And one concept I've found most interesting so far is that of formal grammars.

A formal grammar is a set of _production rules_ for transforming or rewriting strings in some language. For example, here's (a simplified version of) the formal grammar of Lox, the programming language implemented in _Crafting Interpreters_:

```text
program   => statement* EOF
statement => exprStmt | printStmt | block
exprStmt  => expression ";"
printStmt => "print" expression ";"
block     => "{" statement* "}" ;
...
primary   => NUMBER | STRING | "true" | "false" | "nil"
             | "(" expression ")" | IDENTIFIER
```

Each rule describes how we might break down a symbol into constituent symbols:

1. A _program_ is one or more _statements_ followed by the _end-of-file_ symbol.

2. A _statement_ is an _expression statement_, _print statement_, or _block_.

3. An _expression statement_ is an _expression_ followed by a semi-colon.

4. A _print statement_ is a "print" followed by an _expression_ followed by a semi-colon.

5. A _block_ is an opening brace followed by one or more _statements_ followed by a closing brace.

   ...and so on, until...

6. A _primary_ symbol is a _literal value_—a number, string, boolean, nil—a grouped _expression_, or an _identifier_.

The grammar starts with a _start symbol_, "program", in the first rule. Symbols (like literals and identifiers) that can't be further decomposed into other symbols are _terminal symbols_, while the symbols that can are _non-terminal_.

By applying the grammar rules from top to bottom, we can "produce" valid sequences. For example, we can choose to generate _one_ statement, make it a print statement, and use "3" as the expression, which produces the sequence, `print 3;`. And with a different choice in each step, we get a different output sequence.

The set of all possible sequences we can generate with this process is called the _language_ of the grammar. Lox has a recursive grammar: expressions can contain other expressions, as in most other programming languages. So its language set is infinite.

We can also use the grammar rules to parse sequences and check for errors. We can apply the rules in the above grammar to convert this sequence:

```text
print "hello " + "world";
false || true;
print 3 / (4 + 2);
```

...into this tree:

```json
[
  {
    "type": "print_statement",
    "params": {
      "expression": {
        "type": "binary_expression",
        "params": {
          "operator": "+",
          "left": "\"hello \"",
          "right": "\"world\""
        }
      }
    }
  },
  {
    "type": "binary_expression",
    "params": {
      "operator": "||",
      "left": "false",
      "right": "true"
    }
  },
  {
    "type": "print_statement",
    "params": {
      "expression": {
        "type": "binary_expression",
        "params": {
          "operator": "/",
          "left": "3",
          "right": {
            "type": "binary_expression",
            "params": {
              "operator": "+",
              "left": "4",
              "right": "2"
            }
          }
        }
      }
    }
  },
  {
    "type": "EOF"
  }
]
```

We know a sequence is not in the language set if we cannot parse it according to the production rules. In the example below, we first find a block statement and recursively parse its inner statements. But then we find that the outer block has no closing brace, so the sequence is invalid.

```text
{
  print "hello";
  print "world";
```

**II.**

After reading the section in _Crafting Interpreters_ on formal grammars, I planned to write a detailed post about implementing a parser for a formal grammar. I was going to use (a simplified version of) Markdown for the language itself, because I felt Markdown was pretty popular and had a small syntax.

But on closer look, I realized writing the grammar and parser for Markdown wouldn't be as straightforward as it was for Lox.

Lox's grammar is carefully designed to be unambiguous: the symbols within a print statement _must_ form an expression; the symbols within a block _must_ be statements. But Markdown [doesn't work the same way](http://roopc.net/posts/2014/markdown-cfg/).

As one example, Markdown uses asterisks to emphasize text: `*text*` for `<em>text</em>` and `**text**` for `<strong>text</strong>`.

We can specify a basic formal grammar as below:

```text
text-run => ( strong | em | text )*
strong   => "**" text-run "**"
em       => "*" text-run "*"
text     => [a-zA-Z0-9]+
```

But this grammar rejects `*text`, `text*`, `**text`, and `text**` as badly-formed sequences, while Markdown interprets them as plain text.

Programming languages aim to be air-tight with their grammar and enforce correctness by returning parsing errors for invalid sequences—see the [Go](https://go.dev/ref/spec#Notation), [JavaScript](https://262.ecma-international.org/7.0/#sec-lexical-grammar), and [Python](https://docs.python.org/3/reference/grammar.html) specifications, for example. But just like [HTML](http://trevorjim.com/a-grammar-for-html5/), Markdown tries to find the most reasonable output any the given input. Hence, the popular variants of Markdown, like [CommonMark](https://spec.commonmark.org/0.30/) and [GitHub Flavoured Markdown](https://github.github.com/gfm/), have informal specifications written with prose, examples, and test cases instead of a formal grammar.

As for my blog post, I'll have to find a less ambiguous language to use.
