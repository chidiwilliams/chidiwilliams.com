---
title: 'Notes on Crafting Interpreters: Go'
date: 2022-01-21T11:56:59Z
draft: false
---

Many decisions go into making a programming language: What kind of syntax will it have? Will it be dynamically or statically typed? Will it be declarative? Will it have first-class functions? These questions define the form and behaviour of the language. But some other decisions—like, in what language is the compiler or interpreter written?—are implementation details and should (ideally) be invisible to the users of the language.

Over the past few weeks, I’ve been reading through Robert Nystrom’s [_Crafting Interpreters_](https://craftinginterpreters.com/), which describes how to build programming languages and interpreters. Lox, the language implemented in the book, is dynamically-typed and supports closures and classes with a C-like syntax. The first interpreter for the language is a [tree-walk interpreter](<https://en.wikipedia.org/wiki/Interpreter_(computing)#Abstract_syntax_tree_interpreters>) written in Java, and the second is a [bytecode virtual machine](<https://en.wikipedia.org/wiki/Interpreter_(computing)#Bytecode_interpreters>) implemented in C.

To get some more practice with Go, I decided to write the tree-walk interpreter in Go instead of Java. So far, [my implementation](https://github.com/chidiwilliams/glox) can run Lox programs that contain [simple math expressions](https://chidiwilliams.com/post/evaluator/), variable declarations, print statements, and block scoping. But it doesn’t yet support control flow (like if, for, and while statements), functions, or classes. (Still a long way to go!)

Go has a different set of features from Java. And so, translating the book’s interpreter implementation to mine needed a bit more consideration in a few cases:

**Exception handling:** One of the concepts I found most surprising in Go when I first started learning the language was its error handling. Go favours returning errors from functions instead of throwing exceptions (like in JavaScript or Java, for example).

For example, here’s how to open a file in Go:

```go
f, err := os.Open("file.txt")
if err != nil {
	// handle error
}
// use file, f
```

This convention encourages you to check for errors explicitly, but it can quickly get verbose. The Lox parser contains very deeply-nested code that recursively parses statements, expressions, operators, and literals. And adding explicit error handling at each stage would have made the implementation much less readable. Instead, I made use of the panic-and-recover mechanism.

Lox expects all statements to end with a semicolon. So, when the parser finds a statement that does not end with one, it panics with an error message.

```go
// expressionStatement parses expression statements
func (p *parser) expressionStatement() ast.Stmt {
	// parse the next expression
	expr := p.expression()
	// panic if the next token is not a semicolon
	p.consume(ast.TokenSemicolon, "Expect ';' after value")
	return ast.ExpressionStmt{Expr: expr}
}

// consume checks that the next ast.Token is of the given ast.TokenType and then
// advances to the next token. If the check fails, it panics with the given message.
func (p *parser) consume(tokenType ast.TokenType, message string) ast.Token {
	if p.check(tokenType) {
		return p.advance()
	}
	panic(p.error(p.peek(), message))
}
```

At the top level of the parser, we recover from the panic and then “synchronise” the parser. (Synchronising means skipping all the tokens in the error-containing statement and resuming parsing from the next statement. This is how tools like auto-complete continue to work even when there are syntax errors in your code!)

```go
// declaration parses declaration statements. A declaration statement is
// a variable declaration or a regular statement. If the statement contains
// a parse error, it skips to the start of the next statement and returns nil.
func (p *parser) declaration() ast.Stmt {
	defer func() {
		if err := recover(); err != nil {
			// If the error is a parseError, synchronize to
			// the next statement. If not, propagate the panic.
			if _, ok := err.(parseError); ok {
				p.synchronize()
			} else {
				panic(err)
			}
		}
	}()

	if p.match(ast.TokenVar) {
		return p.varDeclaration()
	}
	return p.statement()
}
```

Using panics and recovers instead of error-returning functions leaves the parser [much more readable](https://github.com/chidiwilliams/glox/compare/13e698fc2fec217afec7309e8fcde17dc5a1d683...0f43a66ec97e72e0278ab7792ff43a1ee20eda9d#diff-83eb8e32639d01cf443d6d8bde24c1c8be78766090d8c5f8586c36250cfedca6)—it’s often [better to be pragmatic than a zealot](https://eli.thegreenplace.net/2018/on-the-uses-and-misuses-of-panics-in-go/). And some packages in the standard library, like in `json/encode.go` below, also use a similar technique:

```go
// jsonError is an error wrapper type for internal use only.
// Panics with errors are wrapped in jsonError so that the top-level recover
// can distinguish intentional panics from this package.
type jsonError struct{ error }

func (e *encodeState) marshal(v interface{}, opts encOpts) (err error) {
	defer func() {
		if r := recover(); r != nil {
			if je, ok := r.(jsonError); ok {
				err = je.error
			} else {
				panic(r)
			}
		}
	}()
	e.reflectValue(reflect.ValueOf(v), opts)
	return nil
}
```

**Generics:** The Lox interpreter works in three stages: the `Scanner` class reads the source text and converts it to a flat list of tokens, the `Parser` class converts the list of tokens to an [Abstract Syntax Tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree), and then the `Interpreter` interprets (or executes) the tree.

Each AST node corresponds to a “construct” in the source program: An `Expr.Binary` represents an expression with two operands (like an addition or division expression). An `Expr.Literal` holds a literal value (like a number or a string). And a `Stmt.Var` denotes a variable declaration statement.

The interpreter includes a way to print (for debugging) and execute the AST. Instead of adding `print()` and `interpret()` methods to each node's class, it uses the [visitor pattern](https://en.wikipedia.org/wiki/Visitor_pattern). Each node class implements an `accept()` method that accepts a visitor, and visitors implement the functionality for visiting each node. This helps separate the different algorithms that use the AST nodes from the nodes themselves.

```java
public interface Visitor<T> {
    T visitLiteralExpr(Expr.Literal expr);

    T visitUnaryExpr(Expr.Unary expr);

    T visitBinaryExpr(Expr.Binary expr);
}
```

The AST printer implements `Visitor<String>`: visiting each node returns the string representation of the node. And the interpreter implements `Visitor<Object>`: executing a node might return any type of value, like a string or a boolean.

Go doesn’t yet support generics (as at the latest stable version, Go 1.17), and so the visitor structs return values with `interface{}` type.

```go
type ExprVisitor interface {
	VisitLiteralExpr(Expr LiteralExpr) interface{}
	VisitUnaryExpr(Expr UnaryExpr) interface{}
	VisitBinaryExpr(Expr BinaryExpr) interface{}
}
```

And the visitors, as in the case of the AST printer, need to do further type assertions:

```go
// print returns a string representation of an ast.Expr node
func (a astPrinter) print(expr ast.Expr) string {
	return expr.Accept(a).(string)
}
```

**Standard tooling:** The Lox interpreter also includes a code generator for the AST nodes. The program accepts a list of nodes as generates the data classes (or structs) representing each node.

```go
// cmd/ast.go

writeAst("Expr", []string{
	"Unary    : Operator Token, Right Expr",
	"Binary   : Left Expr, Operator Token, Right Expr",
	"Literal  : Value interface{}",
	"Variable : Name Token",
})

writeAst("Stmt", []string{
	"Block      : Statements []Stmt",
	"Expression : Expr Expr",
	"Var        : Name Token, Initializer Expr",
})
```

The Go binary includes a `go generate` command that runs code generation tools. With the comment below in the `main.go` file of the interpreter, running `go generate` in the package directory runs the `ast.go` file that generates the structs.

```go
//go:generate go run cmd/ast.go
```

Go also ships with its own code formatter out of the box. It’s common to run the formatter on the command line, like `go fmt example.go`—but the formatter is also included in the standard library! Before writing the AST files to disk, the generator formats the text by calling `format.Source()`:

```go
// import "go/format"

formatted, err := format.Source([]byte(text))
```
