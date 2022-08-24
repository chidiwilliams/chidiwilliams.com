---
title: 'A Static Type Checker for B-Minor'
date: 2022-08-21T22:16:10+01:00
draft: true
categories: [languages]
---

In my last few posts, we’ve discussed different topics related to programming languages and interpreters and compilers. In this post, we’ll talk about how to implement a simple static type-checker for the [B-Minor language](https://www3.nd.edu/~dthain/courses/cse40243/fall2020/bminor.html).

B-Minor is a simple C-like language for use in an undergraduate compilers class. It includes expressions, basic control flow, recursive functions, and static type checking.

An example B-Minor program looks like this:

```text
// Prints the sum of all multiples of 3 and 5 less than n
sumMultiples: function integer (n: integer) = {
    sum: integer;
    for (i: integer; i < n; i++) {
        if (i % 3 == 0 || i % 5 == 0) {
            sum = sum + i;
        }
    }
    return sum;
}

print sumMultiples(1000);
```

In this post, we’ll focus on the type checker for the language. We’ll assume a scanner, parser, and interpreter have been implemented.

The type checker accepts a list of statements, `[]Stmt`, like `PrintStmt`, `VarStmt`, `ForStmt`, `ExprStmt`, `BlockStmt`, `IfStmt`, and more. And each of these statements may themselves contain other statements and expressions.

// TODO: Add picture of [Scanner] -> [Parser] -> [Type checker] -> [Interpreter]

To learn more about how some of the other modules work, see Recursive Descent and Pratt Parsing, How to write a Lisp Interpreter in JavaScript, Building an Expression Evaluator, etc.

## The type checker

The goal of a type checker is pretty simple. It accepts a list of AST statements representing the parsed program and reports type errors.

As may have been visible from the example program, B-Minor is strictly typed. You may only assign a value to a variable or function parameter is the type of value and the type of the variable or function parameter match exactly. So, B-Minor has two main classes of type errors: when it is unable to determine the type of an expression, and when the type of a value does not match its assigned variable or function parameter.

We’ll add a type checker struct and a method to check a list of statements and another method to get the type of an expression:

```go
type typeChecker struct {}

func (c *typeChecker) check(statements []Stmt) {
  for _, stmt := range statements {
    c.checkStmt(stmt)
  }
}

func (c *typeChecker) resolveExpr(expr Expr) Type {

}
```

We'll start off with type checking simple expressions and statements, before proceeding to more complex constructs. B-Minor has four atomic types: integers, booleans, characters, and strings. And so, we'll create a values to represent these types: And also a function to say if an atomic type is equal to another type. We'll use the later on for type checking.

```go
type Type interface {
  fmt.Stringer
  Equals(other Type) bool
}

func newAtomicType(name string) Type {
  return &atomicType{name: name}
}

type atomicType struct {
  name string
}

func (t *atomicType) String() string {
  return t.name
}

func (t *atomicType) Equals(other Type) bool {
  return t == other
}
```

Then, we'll create values for the four atomic types:

```go
var (
	typeInteger = newAtomicType("integer")
	typeBoolean = newAtomicType("boolean")
	typeChar    = newAtomicType("char")
	typeString  = newAtomicType("string")
)
```

Next, we'll work on checking simple expression statements:

```go
func (c *typeChecker) check(statements []Stmt) {
  for _, stmt := range statements {
    c.checkStmt(stmt)
  }
}

func (c *typeChecker) checkStmt(stmt Stmt) {
  switch stmt := stmt.(type) {
    case *ExprStmt:
    	c.resolveExpr(stmt.Expr)
    // ...
  }
}

func (c *typeChecker) resolveExpr(expr Expr) Type {
  switch expr := expr.(type) {
    case *LiteralExpr:
      switch expr.Value.(type) {
        case IntegerValue:
          return typeInteger
        case BooleanValue:
          return typeBoolean
        case CharValue:
          return typeChar
        case StringValue:
        	return typeString
    	}
    // ...
  }
}
```

To type check an expression statement, we first try to get the type of the containing expression. If we can get the type, there's nothing left to do, and the type check passes. Getting the type of a literal expression is as simple as returning the atomic type that corresponds to the literal value. That's pretty straightforward. Let's look at some more complex types of expressions.

A binary expression consists of an operator and two operands with the following rules:

- If the operator is `+`, the operands must be integers, strings, or chars
- If the operator is `-`, `*`, `/`, `%`, `^`, `<`, `>`, `<=`, `>=`, the operands must be integers
- Both operands must have the same type

In `resolveExpr`:

```go
case *BinaryExpr:
  leftType := c.resolveExpr(expr.Left)
  rightType := c.resolveExpr(expr.Right)

  switch expr.Operator.TokenType {
  case TokenPlus:
    c.expectExpr(expr.Left, leftType, typeInteger, typeString, typeChar)
  case TokenMinus, TokenStar, TokenSlash, TokenPercent,
    TokenCaret, TokenLess, TokenLessEqual, TokenGreater,
    TokenGreaterEqual:
    c.expectExpr(expr.Left, leftType, typeInteger)
  }

  if !leftType.Equals(rightType) {
    panic(c.error(expr.Left, "'%s' and '%s' are of different types", expr.Left, expr.Right))
  }

  switch expr.Operator.TokenType {
  case TokenLess, TokenGreater, TokenLessEqual,
    TokenGreaterEqual, TokenEqualEqual, TokenBangEqual:
    return typeBoolean
  default:
    return typeInteger
  }
```

`expectExpr` panics with an error if the given expression does not match any of the expected types:

```go
func (c *TypeChecker) expectExpr(expr Expr, exprType Type, expectedTypes ...Type) {
	for _, expectedType := range expectedTypes {
		if exprType.Equals(expectedType) {
			return
		}
	}

  panic(c.error(expr, "expected '%s' to be of type %s, but got '%s'", expr, expectedTypes, exprType))
}
```

Next, we'll add the type inference for prefix, postfix, and logical expressions. We check that their operand expressions have the expected type, and then return the correct type for the expression.

```go
case *PrefixExpr:
  rightType := c.resolveExpr(expr.Right)
  switch expr.Operator.TokenType {
  case TokenMinus: // e.g. -54
    c.expectExpr(expr.Right, rightType, typeInteger)
    return typeInteger
  case TokenBang: // e.g. !x
    c.expectExpr(expr.Right, rightType, typeBoolean)
    return typeBoolean
  }
case *PostfixExpr: // e.g. x++, t--
  leftType := c.resolveExpr(expr.Left)
  c.expectExpr(expr.Left, leftType, typeInteger)
  return typeInteger
case *LogicalExpr: // e.g. d || e, x && y
  leftType := c.resolveExpr(expr.Left)
  c.expectExpr(expr.Left, leftType, typeBoolean)
  rightType := c.resolveExpr(expr.Right)
  c.expectExpr(expr.Right, rightType, typeBoolean)
  return typeBoolean
```

At this point, the type checker can check simple expression statements and report type errors in the containing expressions.

## Variables and scope

Next, we'll look at the statements and expressions that have to do with managing variables and scope in B-Minor.

B-Minor supports variable declarations and block statements, in which the type of a variable corresponds to nearest declaration looking from the nearest scope and walking up the scope chain to the global scope.

```go
x: integer = 1;
y: integer = 2;
{
  x: string = "hello";
  // x is a string in this scope
  print x, y;
}
// x is an integer in this scope
```

To support looking up the scope chain, we'll implement an `Environment` struct which implements a linked list of environments:

```go
type Environment[Value any] struct {
	enclosing *Environment[Value]
	values    map[string]Value
}

func NewEnvironment[Value any](enclosing *Environment[Value]) *Environment[Value] {
	return &Environment[Value]{enclosing: enclosing, values: make(map[string]Value)}
}

func (e *Environment[Value]) Define(name string, value Value) {
	e.values[name] = value
}

func (e *Environment[Value]) Get(name string) Value {
	if v, ok := e.values[name]; ok {
		return v
	}

	if e.enclosing != nil {
		return e.enclosing.Get(name)
	}

  panic(e.error("'%s' is not defined", name))
}
```

The environment struct holds two methods: `Define` maps a name to a value in the current environment. `Get` checks if the current environment holds the value of a given name. If it doesn't, it checks the enclosing environment. If there are no more enclosing environments left to check, it panics with an error.

We'll add an environment to the typechecker that maps variable names to types.

```go
func NewTypeChecker() *TypeChecker {
	return &TypeChecker{env: NewEnvironment[Type](nil)}
}

type TypeChecker struct {
  env *Environment[Type]
}
```

When type checking a variable declaration, first we check that the declared type (which we parsed from the source code) equals the resolved type of the initializer expression. Then, we define the type for the variable in the environment.

```go
func (c *TypeChecker) checkStmt(stmt Stmt) {
	// ...
  case *VarStmt:
    declaredType := c.getType(stmt.Type)
  	resolvedType := c.resolveExpr(stmt.Initializer)
  	c.expectExpr(stmt.Initializer, resolvedType, declaredType)
    c.env.Define(stmt.Name.Lexeme, declaredType)
	// ...
}
```

`c.getType` converts a parsed type to a `Type`. For example, `"integer"` becomes `typeInteger`, "char" becomes `typeChar`, etc.

When resolving a variable expression, we get the value of the variable name from the environment:

```go
func (c *TypeChecker) resolveExpr(expr Expr) Type {
  // ...
	case *VariableExpr:
		return c.env.Get(expr.Name.Lexeme)
}
```

For an assignment expression, e.g. `x = 2;`, we check that the type of the assignment value equals the variable's type:

```go
case *AssignExpr:
  valueType := c.resolveExpr(expr.Value)
  varType := c.env.Get(expr.Name.Lexeme)
  c.expectExpr(expr.Value, valueType, varType)
  return valueType
```

To type check a block statement, we create a new environment for its scope, and then check its inner statements within that scope:

```go
func (c *TypeChecker) checkStmt(stmt Stmt) {
	// ...
	case *BlockStmt:
		previous := c.env
		c.env = NewEnvironment(previous)

		for _, innerStmt := range stmt.Statements {
			c.checkStmt(innerStmt)
		}

		c.env = previous
}
```

## Zero values

B-Minor supports default initialization of variables. Variables declared without an explicit initializer get assigned the "zero value" of their type.

```text
w: integer; // 0
x: string;  // ""
y: boolean; // false
z: char;    // '\000'
```

We'll add a `ZeroValue()` method to the `Type` interface and `atomicType` struct to return the zero value of a given type.

```go
type Type interface {
	Equals(other Type) bool
	ZeroValue() Value
	fmt.Stringer
}

type atomicType struct {
	name      string
	zeroValue any
}

func (t *atomicType) ZeroValue() any {
	return t.zeroValue
}
```

The four atomic types then become:

```go
var (
	typeInteger = newAtomicType("integer", 0)
	typeBoolean = newAtomicType("boolean", false)
	typeChar    = newAtomicType("char", '\000')
	typeString  = newAtomicType("string", "")
)
```

I previously [wrote about how this](https://chidiwilliams.com/post/generic-zero-values-in-go/) can also be done using generic type arguments.

Then in the typechecker, when we reach a `VarStmt` that does not include an initializer, we can set the initializer to a literal statement containing the zero value for the type.

```go
func (c *TypeChecker) checkStmt(stmt Stmt) {
	// ...
	case *VarStmt:
		declaredType := c.getType(stmt.Type)
		if stmt.Initializer != nil {
			resolvedType := c.resolveExpr(stmt.Initializer)
			c.expectExpr(stmt.Initializer, resolvedType, declaredType)
		} else {
			stmt.Initializer = &LiteralExpr{Value: declaredType.ZeroValue()}
		}
		c.env.Define(stmt.Name.Lexeme, declaredType)
}
```

## Print, if, and for statements

B-Minor also supports print, if and for statements like below:

```text
for (i: integer; i < n; i++) {
	if (i % 2) {
		print i, " - ", n - i, "\n";
	}
}
```

To type-check a print statement, we attempt to resolve all its containing expressions:

```go
func (c *TypeChecker) checkStmt(stmt Stmt) {
	// ...
  case *PrintStmt:
  for _, expression := range stmt.Expressions {
    c.resolveExpr(expression)
  }
```

For an if statement, we check that the condition expression is a boolean, and then type-check the then and else branches:

```go
case *IfStmt:
  conditionType := c.resolveExpr(stmt.Condition)
  c.expectExpr(stmt.Condition, conditionType, typeBoolean)
  c.checkStmt(stmt.Consequent)
  if stmt.Alternative != nil {
    c.checkStmt(stmt.Alternative)
  }
```

The parser de-sugars for statements into while statements, which are then type-checked as:

```go
case *WhileStmt:
  conditionType := c.resolveExpr(stmt.Condition)
  c.expectExpr(stmt.Condition, conditionType, typeBoolean)
  c.checkStmt(stmt.Body)
```

## Maps and arrays



---

- What is B-Minor?
- What is static type checking?
- Goals of a type-checker
  - Reporting type errors at compile time
  - Unable to infer the type of an expression
  - Inferred type is not equal to declared type
- Parsing types
- Setting up the type checker
  - Environment
- Expression statements
  - Literal expressions
    - Atomic types: integer, boolean, char, string
  - Binary expressions
    - Arithmetic, boolean
  - Prefix and postfix expressions
  - Logical expressions
- Variables and scope
  - Environments
  - Block statements
  - Variable definitions
    - Default zero values
  - Assignment expressions
  - Variable lookups
- Print statement
- If statement
- For statement
- Maps and array
  - Literals
  - Lookups
- Functions
  - Function statements
  - Call expressions
  - No function expressions because B-Minor doesn't really have function expressions.
  - No function nesting.
  - Function prototype...should just work out of the box in the typechecker module
