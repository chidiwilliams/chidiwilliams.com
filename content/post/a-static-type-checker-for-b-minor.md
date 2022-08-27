---
title: 'A Static Type Checker for B-Minor'
date: 2022-08-21T22:16:10+01:00
draft: true
categories: [languages]
---

In this post, we'll discuss the implementation of a static type checker for a simple, C-like language called [B-Minor](https://www3.nd.edu/~dthain/courses/cse40243/fall2020/bminor.html).

B-Minor is a small language designed for use in an [undergraduate compilers course](https://www3.nd.edu/~dthain/courses/cse40243/fall2020/) and it supports expressions, basic control flow, functions, and static type checking.

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

[[TODO: Add image of stages of the compiler]]

Our type checker accepts the parser's output (a list of AST statements), walks through the AST, and reports type errors it finds.

B-Minor is strictly-typed, meaning a program can only assign a value to a variable (or function parameter) if the types of the value and variable match exactly. So, there are two main classes of type errors: when the type checker cannot determine the type of an expression, and when the type of an expression does not match its assigned variable or function parameter.

We'll represent the type checker and the methods for type-checking statements and resolving the types of expressions as follows:

```go
type typeChecker struct {}

func (c *typeChecker) check(statements []Stmt) {
  for _, stmt := range statements {
    c.checkStmt(stmt)
  }
}

func (c *typeChecker) checkStmt(stmt Stmt) {
	switch stmt := stmt.(type) {
	// ...
	default:
    [[TODO: Remove all panics from code samples]]
		c.error(stmt, "unexpected statement type: %v", stmt))
	}
}

func (c *typeChecker) resolveExpr(expr Expr) Type {
	switch expr := expr.(type) {
    default:
    	c.error(expr, "unexpected expression type: %s", expr)
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

B-Minor also supports maps and arrays which can be declared with map and array literals and accessed and set: {{add type errors to examples}}

```text
m: map string integer = { "hello": 5, "goodbye": 10 };
m["farewell"] = 20;
print m["farewell"], m["hello"];

// map declared without initializer is empty by default
n: map string string; // {}

a: array [5] integer = {1, 2, 3, 4, 5};
a[2] = 39;
print a[4];

// array declared without initializer is filled with zero
// values of its element type
b: array [3] string;  // {"", "", ""}
c: array [2] boolean; // {false, false}
```

First, we need to create a representation of the map type. The map type is a "meta-type" containing two other types: the key type and the value type. And two map types are equal if their key types and value types are also equal.

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

func (m *mapType) String() string {
	return fmt.Sprintf("map %s %s", m.keyType, m.valueType)
}
```

Similarly, we create an array type containing a length value and an element type. Two array types are equal if their lengths and element types are also equal.

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

func (a *arrayType) String() string {
	return fmt.Sprintf("array [%s] %s", a.elementType)
}
```

We resolve the type of an array literal by resolving the element type and creating a new array type based on the element type and array length:

```go
func (c *TypeChecker) resolveExpr(expr Expr) Type {
  // ...
	case *ArrayExpr:
		firstElementType := c.resolveExpr(expr.Elements[0])
		for _, element := range expr.Elements[1:] {
			elementType := c.resolveExpr(element)
			c.expectExpr(element, elementType, firstElementType)
		}
		return newArrayType(firstElementType, len(expr.Elements), false)
```

Similarly, we resolve map literals by resolving the key and value types:

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

We resolve get expressions (like `arr[index]`, `m[key]`) and set expressions (like `arr[index] = 3`, `m[key] = 4`) as follows:

```go
	case *GetExpr:
		return c.resolveLookup(expr.Object, expr.Name)
	case *SetExpr:
		expectedValueType := c.resolveLookup(expr.Object, expr.Name)
		valueType := c.resolveExpr(expr.Value)
		c.expectExpr(expr.Value, valueType, expectedValueType)
		return expectedValueType
```

`resolveLookup` returns the type of a value in a map or element in an array, while checking that the lookup key has the correct type.

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
		panic(c.error(object, "can only index maps and arrays"))
	}
}
```

## Functions

Finally, we'll discuss type-checking functions. B-Minor functions are declared and called as follows:

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

As we did with maps and arrays, we first defined a representation for the function type. A function's type is defined by the type of its parameters and its return type; so a function has the same type as another function if their return types are equal and their parameters all have the same type. {{maybe remove string representation from other type structs as well}}

```go
type functionType struct {
	paramTypes []paramType
	returnType Type
}

type paramType struct {
	Name Token
	Type Type
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
		if !paramType.Type.Equals(otherFunctionType.paramTypes[i].Type) {
			return false
		}
	}
	return true
}
```

To type-check a function declaration:

```go
func (c *TypeChecker) checkStmt(stmt Stmt) {
	// ...
  case *FunctionStmt:
  	// save the function's type in the environment before type-checking the function body
    // because the function body may contain a recursive call to itself
		fnType := c.getType(stmt.TypeExpr)
		c.env.Define(stmt.Name.Lexeme, fnType)

  // begin a new scope for the function body
		previous := c.env
		c.env = NewEnvironment(previous)
  
		c.hasCurrentFunctionReturned = false

  // define the param types within the function scope
		for _, param := range stmt.TypeExpr.Params {
			c.env.Define(param.Name.Lexeme, c.getType(param.Type))
		}

		c.currentFunctionReturnType = fnType.(*functionType).returnType

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

Note the checks we ensure that the function returns a value with the correct type.

Next, we resolve function calls by checking the called value is a function and that the argument types match the types of the function parameters.

```go
func (c *TypeChecker) resolveExpr(expr Expr) Type {
	// ...
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
