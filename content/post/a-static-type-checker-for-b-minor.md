---
title: 'A Static Type Checker for B-Minor'
date: 2022-08-28T08:16:10+01:00
draft: false
categories: [languages]
images:
  [
    'https://res.cloudinary.com/cwilliams/image/upload/v1661685391/Blog/static-type-checkers.webp',
  ]
---

{{< figure src="https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_650/v1661685391/Blog/static-type-checkers.webp" alt="\"A solarpunk robot dreaming about lambda symbols and sets and functional programming\" via Stable Diffusion" width="600" height="300" >}}

In this post, we'll discuss the implementation of a static type checker for a simple, C-like language called [B-Minor](https://www3.nd.edu/~dthain/courses/cse40243/fall2020/bminor.html).
B-Minor is a small language designed for use in an [undergraduate compilers course](https://www3.nd.edu/~dthain/courses/cse40243/fall2020/), and it supports expressions, basic control flow, functions, and static type checking.

Here's an example B-Minor program:

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

## The type checker

A compiler (or interpreter) typically performs semantic analysis, checking for errors like type mismatches and misuse of reserved identifiers, after scanning and parsing source tokens into an Abstract Syntax Tree (AST).

{{< figure src="https://res.cloudinary.com/cwilliams/image/upload/v1661677031/Blog/stages-of-a-unix-compiler.webp" alt="Stages of a Unix compiler" width="600" height="117" caption="Source: \"Introduction to Compilers and Language Design\", Douglas Thain" >}}

Our type checker accepts the parser's output (a list of AST statements), walks through the AST, and reports type errors it finds.

B-Minor is strictly-typed, meaning a program can only assign a value to a variable (or function parameter) if the types of the value and variable match exactly. So, there are two main classes of type errors: when the type checker cannot determine the type of an expression, and when an expression's type does not match its assigned variable or function parameter.

We'll represent the type checker and the methods for type-checking statements and resolving the types of expressions as follows:

```go
type TypeChecker struct {}

func (c *TypeChecker) check(statements []Stmt) {
	for _, stmt := range statements {
		c.checkStmt(stmt)
	}
}

func (c *TypeChecker) checkStmt(stmt Stmt) {
	switch stmt := stmt.(type) {
	// ...
	default:
		panic(c.error(stmt, "unexpected statement type: %v", stmt))
	}
}

func (c *TypeChecker) resolveExpr(expr Expr) Type {
	switch expr := expr.(type) {
	// ...
	default:
		panic(c.error(expr, "unexpected expression type: %s", expr))
	}
}
```

We'll start off with simple expressions and statements before proceeding to more complex constructs.

B-Minor has four atomic types: integers, booleans, characters and strings. We'll create a type to represent these atomic types, with an `Equals` method that checks if two B-Minor types are equal:

```go
type Type interface {
	Equals(other Type) bool
}

func newAtomicType(name string) Type {
	return &atomicType{name: name}
}

type atomicType struct {
	name string
}

func (t *atomicType) Equals(other Type) bool {
	return t == other
}
```

Then, the four atomic types will be:

```go
var (
	typeInteger = newAtomicType("integer")
	typeBoolean = newAtomicType("boolean")
	typeChar = newAtomicType("char")
	typeString = newAtomicType("string")
)
```

To type-check an expression statement like `3 * 9;` or `"hello" + "world";`, we try to resolve the contained expression:

```go
func (c *TypeChecker) checkStmt(stmt Stmt) {
	switch stmt := stmt.(type) {
		case *ExprStmt:
			c.resolveExpr(stmt.Expr)
		// ...
```

A literal expression, like `"hello"` or `9`, resolves to its corresponding atomic type:

```go
func (c *TypeChecker) resolveExpr(expr Expr) Type {
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

An expression may also be a binary expression, like `4 * 9` or `8 > 4`, consisting of an operator and two operands. Binary expressions follow these type rules:

- If the operator is `+`, the operands must be integers, strings, or characters
- If the operator is `-`, `*`, `/`, `%`, `^`, `<`, `>`, `<=`, or `>=`, the operands must be integers
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

`expectExpr` reports an error if an expression does not match any of its expected types:

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

Next, we'll implement type inference for prefix, postfix, and logical expressions. In each case, we check that the operands have the expected types and then return the correct type for the expression.

```go
case *PrefixExpr: // -43, !x
	rightType := c.resolveExpr(expr.Right)
	switch expr.Operator.TokenType {
	case TokenMinus:
		c.expectExpr(expr.Right, rightType, typeInteger)
		return typeInteger
	case TokenBang:
		c.expectExpr(expr.Right, rightType, typeBoolean)
		return typeBoolean
	}
case *PostfixExpr: // i++, b--
	leftType := c.resolveExpr(expr.Left)
	c.expectExpr(expr.Left, leftType, typeInteger)
	return typeInteger
case *LogicalExpr: // a && b, x || y
	leftType := c.resolveExpr(expr.Left)
	c.expectExpr(expr.Left, leftType, typeBoolean)
	rightType := c.resolveExpr(expr.Right)
	c.expectExpr(expr.Right, rightType, typeBoolean)
	return typeBoolean
```

## Variables and scope

Next, we'll discuss statements and expressions that manage variables and scope, starting with variable declarations and block statements.

```text
x: integer = 1;
y: integer = 2;
{
  x: string = "hello";
  print x + "world";
}
print x - y;
```

To support looking up the scope chain, we'll implement an `Environment` type which represents a linked list of scopes:

```go
type Environment[Value any] struct {
	enclosing *Environment[Value]
	values    map[string]Value
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

The environment type has two methods: `Define` maps a name to a value in the current environment. And `Get` checks if the current environment holds the value of a given name; if it doesn't, it checks the enclosing environment; and if there are no more enclosing environments left to check, it reports an error.

We'll add an environment to the type checker that maps variable names to types.

```go
type TypeChecker struct {
	env *Environment[Type]
}
```

When type-checking a variable declaration, we first check that the declared type (which we parse from the source code) equals the resolved type of the initializer expression. Then, we define the type of the variable in the environment. In `checkStmt`:

```go
case *VarStmt:
	declaredType := c.getType(stmt.Type)
	resolvedType := c.resolveExpr(stmt.Initializer)
	c.expectExpr(stmt.Initializer, resolvedType, declaredType)
	c.env.Define(stmt.Name.Lexeme, declaredType)
```

(`getType` converts a parsed type from an AST node to a `Type`. For example, `"integer"` becomes `typeInteger`, `"char"` becomes `typeChar`, etc.)

To resolve a variable expression's type, we retrieve its value of the variable name from the environment. In `resolveExpr`:

```go
case *VariableExpr:
	return c.env.Get(expr.Name.Lexeme)
```

For an assignment expression, like `x = 2`, we check that the variable and the assignment value have the same type:

```go
case *AssignExpr:
	valueType := c.resolveExpr(expr.Value)
	varType := c.env.Get(expr.Name.Lexeme)
	c.expectExpr(expr.Value, valueType, varType)
	return valueType
```

To type-check a block statement, we recursively type-check the nested statements within a new block scope:

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

## Default initialization

B-Minor supports default initialization of variables. If a variable is declared without an explicit initializer, the compiler assigns it its type's default value (or "zero value").

```text
a: integer; // 0
b: string;  // ""
c: boolean; // false
d: char;    // '\000'
```

To implement this, we'll add a `ZeroValue()` method to return the zero value of a type:

```go
type Type interface {
	Equals(other Type) bool
	ZeroValue() Value
}

type atomicType struct {
	name      string
	zeroValue Value
}

func (t *atomicType) ZeroValue() Value {
	return t.zeroValue
}
```

The four atomic types then become:[^ksm]

[^ksm]: I previously [wrote about](https://chidiwilliams.com/post/generic-zero-values-in-go/) an alternative implementation that infers the zero value of a B-Minor atomic type from its Go implementation type by using a generic type argument.

```go
var (
	typeInteger = newAtomicType("integer", IntegerValue(0))
	typeBoolean = newAtomicType("boolean", BooleanValue(false))
	typeChar = newAtomicType("char", CharValue('\000'))
	typeString = newAtomicType("string", StringValue("")
)
```

Back in the type checker, if a variable declaration does not include an initializer, we default it to the zero value of the variable's type.

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

B-Minor also supports print, if and for statements:

```text
for (i: integer; i < n; i++) {
	if (i % 2) {
		print i, " - ", n - i, "\n";
	}
}
```

To type-check a print statement, we try to resolve all its contained expressions:

```go
case *PrintStmt:
	for _, expr := range stmt.Expressions {
		c.resolveExpr(expr)
	}
```

For an if statement, we check that the condition expression is a boolean and then type-check the then and else branches:

```go
case *IfStmt:
	conditionType := c.resolveExpr(stmt.Condition)
	c.expectExpr(stmt.Condition, conditionType, typeBoolean)
	c.checkStmt(stmt.Consequent)
	if stmt.Alternative != nil {
		c.checkStmt(stmt.Alternative)
	}
```

The B-Minor parser [de-sugars](https://github.com/chidiwilliams/bminor/blob/759d4f803e64bb54de2ec6c5352c25971e4131d7/interpreter/parser.go#L157-L195) for statements into while statements, which we type-check as:

```go
case *WhileStmt:
	conditionType := c.resolveExpr(stmt.Condition)
	c.expectExpr(stmt.Condition, conditionType, typeBoolean)
	c.checkStmt(stmt.Body)
```

## Maps and arrays

B-Minor supports maps and arrays, which may be declared, accessed, and updated as:

```text
m: map string integer = { "hello": 5, "goodbye": 10 };
m["farewell"] = 20;
print m["farewell"], m["hello"];

// map declared without initializer is empty by default
n: map string string; // {}

a: array [5] integer = {1, 2, 3, 4, 5};
a[2] = 39;
print a[4];

// array declared without initializer is filled
// with zero values of its element type
b: array [3] string;  // {"", "", ""}
c: array [2] boolean; // {false, false}
```

First, we need to create a representation of the map type. The map type contains two other types: the key type and the value type. And two map types are equal if their key types and value types match.

```go
type mapType struct {
	keyType   Type
	valueType Type
}

func (m *mapType) Equals(other Type) bool {
	otherMapType, ok := other.(*mapType)
	if !ok {
		return false
	}

	return m.keyType.Equals(otherMapType.keyType) &&
		m.valueType.Equals(otherMapType.valueType)
}

func (m *mapType) ZeroValue() Value {
	return MapValue{}
}
```

Similarly, we create an array type containing a length value and an element type. Two array types are equal if their lengths and element types are equal.

```go
type arrayType struct {
	length      int
	elementType Type
}

func (a *arrayType) Equals(other Type) bool {
	otherArrayType, ok := other.(*arrayType)
	if !ok {
		return false
	}

	return a.length == otherArrayType.length &&
		a.elementType.Equals(otherArrayType.elementType)
}

func (a *arrayType) ZeroValue() Value {
	arr := ArrayValue(make([]Value, a.length))
	for i := 0; i < a.length; i++ {
		arr[i] = a.elementType.ZeroValue()
	}
	return arr
}
```

We resolve the type of a map literal by resolving its key and value types:

```go
case *MapExpr:
	if len(expr.Pairs) == 0 {
		return newMapType(typeAny, typeAny)
	}

	firstPair := expr.Pairs[0]
	firstKeyType := c.resolveExpr(firstPair.Key)
	firstValueType := c.resolveExpr(firstPair.Value)

	for _, pair := range expr.Pairs[1:] {
		keyType := c.resolveExpr(pair.Key)
		c.expectExpr(pair.Key, keyType, firstKeyType)
		valueType := c.resolveExpr(pair.Value)
		c.expectExpr(pair.Value, valueType, firstValueType)
	}

	return newMapType(firstKeyType, firstValueType)
```

And we resolve the type of an array literal by resolving its element type and creating a new array type based on the element type and array length:

```go
case *ArrayExpr:
	firstElementType := c.resolveExpr(expr.Elements[0])
	for _, element := range expr.Elements[1:] {
		elementType := c.resolveExpr(element)
		c.expectExpr(element, elementType, firstElementType)
	}
	return newArrayType(firstElementType, len(expr.Elements), false)
```

To resolve get expressions (like `arr[index]` and `m[key]`) and set expressions (like `arr[index] = 3` and `m[key] = 4`):

```go
case *GetExpr:
	return c.resolveLookup(expr.Object, expr.Name)
case *SetExpr:
	expectedValueType := c.resolveLookup(expr.Object, expr.Name)
	valueType := c.resolveExpr(expr.Value)
	c.expectExpr(expr.Value, valueType, expectedValueType)
	return expectedValueType
```

`resolveLookup` returns the type of a map value or array element while checking that the lookup key has the correct type.

```go
func (c *TypeChecker) resolveLookup(object, name Expr) Type {
	objectType := c.resolveExpr(object)
	switch objectType := objectType.(type) {
	case *arrayType:
		indexType := c.resolveExpr(name)
		c.expectExpr(name, indexType, typeInteger)
		return objectType.elementType
	case *mapType:
		indexType := c.resolveExpr(name)
		c.expectExpr(name, indexType, objectType.keyType)
		return objectType.valueType
	default:
		panic(c.error(object, "can only lookup maps and arrays"))
	}
}
```

## Functions

Finally, we'll add type-checking for B-Minor functions:

```text
fibonacci: function integer (x: integer) = {
    if (x < 2) {
        return x;
    } else {
        return fibonacci(x - 1) + fibonacci(x - 2);
    }
}

print fibonacci(20);
```

As with maps and arrays, we start by defining a representation for function types. A function type contains the types of its parameters and its return type. Consequently, two functions have the same type if their return types are equal and their parameters have the same types.

```go
type functionType struct {
	paramTypes []Type
	returnType Type
}

func (f *functionType) Equals(other Type) bool {
	otherFunctionType, ok := other.(*functionType)
	if !ok {
		return false
	}
	if f.returnType != otherFunctionType.returnType {
		return false
	}
	if len(f.paramTypes) != len(otherFunctionType.paramTypes) {
		return false
	}
	for i, paramType := range f.paramTypes {
		if !paramType.Equals(otherFunctionType.paramTypes[i]) {
			return false
		}
	}
	return true
}
```

To type-check a function declaration:

```go
case *FunctionStmt:
	// save the function's type in the environment before
	// type-checking the function body, because the function
	// may contain a recursive call to itself
	fnType := c.getType(stmt.TypeExpr)
	c.env.Define(stmt.Name.Lexeme, fnType)

	// begin a new scope for the function body
	previous := c.env
	c.env = NewEnvironment(previous)

	c.hasCurrentFunctionReturned = false
	c.currentFunctionReturnType = fnType.(*functionType).returnType

	// define the param types within the function scope
	for _, param := range stmt.TypeExpr.Params {
		c.env.Define(param.Name.Lexeme, c.getType(param.Type))
	}

	// check the function body
	c.checkStmt(stmt.Body)

	if c.currentFunctionReturnType != typeVoid && !c.hasCurrentFunctionReturned {
	panic(c.error(stmt, "expected function to return value of type '%s'", c.currentFunctionReturnType))
	}

	// end the function body scope and restore the outer scope
	c.env = previous
```

For a return statement within a function:

```go
case *ReturnStmt:
	if stmt.Value != nil && c.currentFunctionReturnType == typeVoid {
		panic(c.error(stmt.Value, "not expecting any return value"))
	}
	valueType := c.resolveExpr(stmt.Value)
	c.expectExpr(stmt.Value, valueType, c.currentFunctionReturnType)
	c.hasCurrentFunctionReturned = true
```

To resolve function calls, we check that the called value is a function and that the argument types match the corresponding function parameters:

```go
case *CallExpr:
	calleeType, ok := c.resolveExpr(expr.Callee).(*functionType)
	if !ok {
		panic(c.error(expr.Callee, "%s is not a function", expr.Callee))
	}

	for i, arg := range expr.Arguments {
		argType := c.resolveExpr(arg)
		expectedType := calleeType.paramTypes[i].Type
		c.expectExpr(arg, argType, expectedType)
	}

	return calleeType.returnType
```

The complete implementation of the B-Minor interpreter is available [on GitHub](https://github.com/chidiwilliams/bminor/tree/3984d1dd78f1733ab8841c95bea9413b94fce8cd/interpreter). See the [language specification](https://www3.nd.edu/~dthain/courses/cse40243/fall2020/bminor.html) or the online textbook, [_Introduction to Compilers and Language Design_](https://www3.nd.edu/~dthain/compilerbook/), to learn more about B-Minor and compilers.
