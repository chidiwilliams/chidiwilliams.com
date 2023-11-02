---
title: 'Generic Zero Values in Go'
date: 2022-08-12T07:55:39+01:00
draft: false
categories: [languages]
---

When a variable or value is declared without explicit initialization, the Go compiler assigns it a default value. From the [Go spec](https://go.dev/ref/spec#The_zero_value):

> Each element of such a variable or value is set to the _zero value_ for its type: `false` for booleans, `0` for numeric types, `""` for strings, and `nil` for pointers, functions, interfaces, slices, channels, and maps. This initialization is done recursively, so for instance each element of an array of structs will have its fields zeroed if no value is specified.
>
> These two simple declarations are equivalent:
>
> ```go
> var i int
> var i int = 0
> ```
>
> After
>
> ```go
> type T struct { i int; f float64; next *T }
> t := new(T)
> ```
>
> the following holds:
>
> ```go
> t.i == 0
> t.f == 0
> t.next == nil
> ```
>
> The same would also be true after
>
> ```go
> var t T
> ```

It is also idiomatic to make the [zero value useful](https://dave.cheney.net/2013/01/19/what-is-the-zero-value-and-why-is-it-useful). Types like [`sync.Mutex`](https://pkg.go.dev/sync#Mutex) and [`bytes.Buffer`](https://pkg.go.dev/bytes#Buffer) are designed to be ready to use without explicit initialization:

```go
type SafeInt struct {
	mutex sync.Mutex
	value int
}

func (i *SafeInt) Increment() {
	i.mutex.Lock()
	defer i.mutex.Unlock()
	i.value++
}

func main() {
	var i SafeInt
	i.Increment() // i.value == 1

	var buffer bytes.Buffer
	buffer.WriteString("Hello")
	fmt.Println(buffer.String()) // "Hello"
}
```

I've recently been working on [an interpreter](https://github.com/chidiwilliams/bminor) for a language called [B-Minor](https://www3.nd.edu/~dthain/courses/cse40243/fall2020/bminor.html), taking the opportunity to try out generics with the new Go compiler (version >1.18). And I found that zero-value initialization also works quite well with generic types.

B-Minor has four atomic types (integers, booleans, characters, and strings) and is strictly typed; so, values can only be assigned to variables if their types match exactly. In the type checker of the interpreter, I represented these types as:

```go
type Type interface {
	// Equals returns true if both types are equal
	Equals(other Type) bool
}

func newAtomicType(name string) Type {
	return atomicType{name: name}
}

type atomicType struct {
	name string
}

func (t atomicType) Equals(other Type) bool {
	return t == otherType
}

var integerType = newAtomicType("integer")
var booleanType = newAtomicType("boolean")
var charType = newAtomicType("char")
var stringType = newAtomicType("string")
```

Similar to Go, B-Minor also supports default variable initialization:

```text
w: integer; // 0
x: string;  // ""
y: boolean; // false
z: char;    // '\000'
```

One way to implement this is by passing the zero value to `newAtomicType`:

```go
type Type interface {
	// Equals returns true if both types are equal
	Equals(other Type) bool
	// ZeroValue returns the default value a variable of this
	// type will be initialized to if no explicit initialization
	// is provided
	ZeroValue() interface{}
}

func newAtomicType(name string, zeroValue interface{}) Type {
	return atomicType{name: name, zeroValue: zeroValue}
}

type atomicType struct {
	name string
	zeroValue interface{}
}

// ...

func (t atomicType) ZeroValue() interface{} {
	return t.zeroValue
}

var integerType = newAtomicType("integer", int(0))
var booleanType = newAtomicType("boolean", false)
var charType = newAtomicType("char", '\000')
var stringType = newAtomicType("string", "")
```

Then in the interpreter:

```go
func (i *Interpreter) interpretStatement(stmt Stmt) {
	switch stmt := stmt.(type) {
	case VarStmt:
		var value Value
		if stmt.Initializer == nil {
			value = stmt.Type.ZeroValue()
		} else {
			value = i.interpretExpr(stmt.Initializer)
		}
		// ...
}
```

Alternatively, you can rely on Go's own default initialization by making `atomicType` generic:

```go
func newAtomicType[BackingType any](name string) Type {
	return atomicType[BackingType]{name: name}
}

type atomicType[BackingType any] struct {
	name string
	zeroValue BackingType
}

// ...

func (t atomicType[BackingType]) ZeroValue() interface{} {
	return t.zeroValue
}

var integerType = newAtomicType[int]("integer")
var booleanType = newAtomicType[bool]("boolean")
var charType = newAtomicType[rune]("char")
var stringType = newAtomicType[string]("string")
```

`atomicType` now accepts a Go type as a type argument, and the Go compiler automatically initializes the generic `zeroValue` field to its correct zero value. By making `atomicType` generic, we can also imagine extending it in the future with more functionalities that depend on its backing type.
