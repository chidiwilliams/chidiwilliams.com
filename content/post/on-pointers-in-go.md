---
title: On Pointers in Go
date: 2022-02-25T12:00:25+01:00
draft: false
thumbnail: 'https://res.cloudinary.com/cwilliams/image/upload/v1645803353/Blog/amimhgvppjxtcfbenpzy.webp'
images:
  [
    'https://res.cloudinary.com/cwilliams/image/upload/v1645803535/Blog/sqihjbxed0z0uxp1ya08.webp',
  ]
---

When I first started learning to write Go, there were two concepts I found most confusing at first: [slices](https://chidiwilliams.com/post/inside-a-go-slice/) and pointers. Because, up until that point, I'd spent most of my time working with dynamic languages like Python and JavaScript, which do not support slices and explicit pointers.

"_When_ should I use a pointer?" That's the key question I've had as I've learned about pointers. In some cases, it's clear that a pointer is the way to go: [pointer receivers let methods modify their receivers](https://go.dev/tour/methods/8) and [a nil pointer signifies that a value is "missing"](https://www.digitalocean.com/community/conceptual_articles/understanding-pointers-in-go#nil-pointers). But in some other scenarios, I still have to rethink why some value should be a pointer.

## Global variables in Lox

I've recently been building an interpreter for a programming language called Lox (see [Notes on Crafting Interpreters: Go](/post/notes-on-crafting-interpreters-go/), [Ambiguous Grammars](/post/ambiguous-grammars/), and [The Temporal Dead Zone in JavaScript](/post/the-temporal-dead-zone-in-javascript/)). The struct that implements the core interpreter receives a list of statements representing the program and interprets (or executes) them in turn:

```go
type Interpreter struct {
	// the current execution environment
	env environment
}

func (in *Interpreter) Interpret(statements []ast.Stmt) {
	for _, statement := range statements {
		in.execute(statement)
	}
}
```

(It's important to note that the `env` field has a type of `environment`. We'll discuss it in more detail in the next section.)

Program execution happens within a context (or an environment) which stores all the global and local variables defined by and accessible to the program at each point in time. So, the `environment` struct defines methods to set and retrieve variable values.

```go
type environment struct {
	values    map[string]interface{}
}

func (e *environment) define(name string, value interface{}) {
	e.values[name] = value
}

func (e *environment) get(name ast.Token) (interface{}, error) {
	if val, ok := e.values[name.Lexeme]; ok {
		return val, nil
	}
	return nil, runtimeError{name, fmt.Sprintf("Undefined variable '%s'", name.Lexeme)}
}
```

The implementation of the interpreter worked. Declaring a variable with a `var` statement defined the variable name in the environment, while using the variable identifier within a statement or expression retrieved its value from the environment.

```go
// in.env == {values:map[]}

var a = 30;

// in.env == {values:map[a:30]}

var b = 45;

// in.env == {values:map[a:30 b:45]}

print a * b / 2; // prints "675"
```

## Local variables in Lox

Lox also supports local (or block-scoped) variables. Like global variables, local variables are also defined with a `var` statement. But their scope is limited within the block in which they are defined.

```go
var a = 1;
var b = 2;
{
	var b = 3;
	var c = 4;
	print a; // prints 1 from global
	print b; // prints 3 from re-declared local
	print c; // prints 4 from local
}
print a; // prints 1 from global
print b; // prints 2 from global
print c; // Error: Undefined variable c
```

I implemented block scoping using a linked list of `environment` structs. In addition to its own `values`, an `environment` now holds a pointer to the `environment` of its parent (or enclosing) scope.

```go
type environment {
	// environment of the parent scope
	enclosing *environment
	// values set in this environment
	values map[string]interface{}
}
```

In the `environment`'s `get` method, it check its `values` to see if the variable is set in the current scope. And if it isn't, it recurses into the enclosing environment to look for the variable.

```go
func (e *environment) get(name ast.Token) (interface{}, error) {
	if val, ok := e.values[name.Lexeme]; ok {
		return val, nil
	}
	if e.enclosing != nil {
		return e.enclosing.get(name)
	}
	return nil, runtimeError{name, fmt.Sprintf("Undefined variable '%s'", name.Lexeme)}
}
```

To execute a block statement, the interpreter creates a new environment, setting the current one as its "parent"; executes the body of the block within this environment; and then restores the initial environment at the end of the block.

```go
func (in *Interpreter) VisitBlockStmt(stmt ast.BlockStmt) interface{} {
  // Create a new environment and set the current environment as enclosing
  blockEnv := environment{enclosing: &in.env}

  // Restore the current environment after executing this block
  previous := in.env
  defer func() { in.env = previous }()

  // Set the blockEnv as the new execution environment
  in.environment = blockEnv

  // Then execute all the statements
  for _, statement := range statements {
		in.execute(statement)
	}
}
```

## Testing the block scope

This implementation seemed to make sense. But when I tried executing some test programs, I found that it had a problem. The interpreter could look up variables defined in the current scope:

```go
var a = 1;
{
  var a = 2;
  print a; // 2
}
print a; // 2
```

But when a program tried to access a variable defined in an enclosing scope, the interpreter crashed with a stack overflow error:

```go
var a = 1;
{
  print a;
}

/*
runtime: goroutine stack exceeds 1000000000-byte limit
runtime: sp=0xc0201603b8 stack=[0xc020160000, 0xc040160000]
fatal error: stack overflow

runtime stack:
runtime.throw({0x1124316, 0x11f9ae0})
	/usr/local/go/src/runtime/panic.go:1198 +0x71
runtime.newstack()
	/usr/local/go/src/runtime/stack.go:1088 +0x5ac
runtime.morestack()
	/usr/local/go/src/runtime/asm_amd64.s:461 +0x8b
*/
```

The offending line of code came from the `get` method of the `environment` struct, where we looked up the value of a variable from the enclosing scope.

```go
func (e *environment) get(name ast.Token) (interface{}, error) {
	if val, ok := e.values[name.Lexeme]; ok {
		return val, nil
	}
	if e.enclosing != nil {
		return e.enclosing.get(name) // <<<<<<<<<
	}
	return nil, runtimeError{name, fmt.Sprintf("Undefined variable '%s'", name.Lexeme)}
}
```

For some reason, the pointer to the enclosing environment referred to the environment itself. The linked list of `environment` structs formed a _loop_, and trying to find the last value of the loop produced the stack overflow error.

I instinctively suspected the issue may have been related to defining the `env` field in the `Interpreter` as a struct. (It was.) And so I changed it to a pointer to a struct, without thinking much more about it.

```go
type Interpreter struct {
  // before: "env environment"
	env *environment
}

func (in *Interpreter) VisitBlockStmt(stmt ast.BlockStmt) interface{} {
  // before: "blockEnv := environment{enclosing: &in.environment}"
  blockEnv := environment{enclosing: in.environment}

  previous := in.environment
  defer func() { in.environment = previous }()

  // before: "in.environment = blockEnv"
  in.environment = &blockEnv

  // ...execute the block...
}
```

Changing those three lines worked and the interpreter began to handle block scopes as expected. If you were already familiar with how pointers work, you may have caught why this happened. Here's a summary of the change and a more detailed review below.

| Before                                                                                                                            | After                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Interpreter` is a struct with an `environment` field.                                                                            | `Interpreter` is a struct with an `*environment` field.                                                                                                 |
| The block environment is `environment{enclosing: &in.environment}`, which is enclosed by **whatever the current environment is**. | The block environment is `environment{enclosing: in.environment}`, which is enclosed by **what the current environment is pointing to**.                |
| After setting the block environment to be the new environment, its `enclosing` field now points to **itself**.                    | After setting the block environment to be the new environment, its `enclosing` field still points to **what the previous environment was pointing to**. |
| (Not what we want)                                                                                                                | (Exactly what we want)                                                                                                                                  |

## A review of the first case

Let's take a closer look at the first implementation.

```go
type Interpreter struct {
	env environment
}
```

![Interpreter with environment struct](https://res.cloudinary.com/cwilliams/image/upload/c_scale,h_200/v1645803451/Blog/io5iz6s6badkglvb0hrp.webp)

To interpret a block statement, we created a new environment with its `enclosing` field pointing to `in.environment`.

```go
blockEnv := environment{enclosing: &in.environment}
```

Here's what that actually looks like:

![Block environment pointing to interpreter environment](https://res.cloudinary.com/cwilliams/image/upload/v1645803353/Blog/amimhgvppjxtcfbenpzy.webp)

When we say "pointing to `in.environment`", we mean that the **value** of `blockEnv.enclosing` is set to the **memory address** of the `in.environment` field:

```go
// Create a new interpreter with an environment
in := interpreter{env: environment{}}

// Create a environment for the block
blockEnv := environment{enclosing: &in.env}

// Print the address of in.env
fmt.Printf("%p", &in.env)             // 0xc00004a510

// Print the value of blockEnv.enclosing
fmt.Printf("%p", blockEnv.enclosing)  // 0xc00004a510
```

Even if the value of `in.env` changes, the address `&in.env` doesn't change and `blockEnv.enclosing` still points to it.

```go
in.env = environment{}

fmt.Printf("%p", &in.env)            // 0xc00004a510
fmt.Printf("%p", blockEnv.enclosing) // 0xc00004a510
```

It may now be clearer how we set the environment to a structure that points to its own location when we assigned `in.env = blockEnv`.

![Interpreter environment pointing to itself](https://res.cloudinary.com/cwilliams/image/upload/c_scale,h_200/v1645803400/Blog/rifedqb9vunqwp5cma2p.webp)

## A review of the second case

In the working version of the interpreter, we defined the `env` field as a pointer to an `environment`:

```go
type Interpreter struct {
  env *environment
}
```

![Interpreter with environment pointer](https://res.cloudinary.com/cwilliams/image/upload/v1645803548/Blog/kns2nhko3vmbzjp8jt5o.webp)

To execute a block, we create a new environment:

```go
blockEnv := environment{enclosing: in.environment}
```

In this version, we create a new `environment` struct. For its `enclosing` field, it takes (a copy of) the value of `in.environment`, which is a pointer to the current environment.

![Block environment pointing to same as interpreter environment](https://res.cloudinary.com/cwilliams/image/upload/v1645803541/Blog/bpfwlmsqa0flfjoe65ta.webp)

The value of `blockEnv.enclosing` is the memory address of the environment `in.environment` points to, _not_ the memory address of `in.environment` itself.

```go
in := interpreter{env: &environment{}}

blockEnv := environment{enclosing: in.env}

fmt.Printf("%p\n", &in.env)            // 0xc00011a680
fmt.Printf("%p\n", blockEnv.enclosing) // 0xc00010a500
fmt.Printf("%p\n", in.env)             // 0xc00010a500
```

If we-reassign `in.environment` to a new environment, the address `&in.environment` and the value of `blockEnv.enclosing` stay the same, while the pointer value of `in.environment` changes:

```go
in.env = &environment{}
fmt.Printf("%p\n", &in.env)            // 0xc00011a680
fmt.Printf("%p\n", blockEnv.enclosing) // 0xc00010a500
fmt.Printf("%p\n", in.env)             // 0xc00010a510
```

![Interpreter environment pointing to correct block environment](https://res.cloudinary.com/cwilliams/image/upload/v1645803535/Blog/sqihjbxed0z0uxp1ya08.webp)

## Coda

Two questions I've found to help me understand and apply pointers better:

- Do I want to point to X or share an underlying value with X? (The former means creating a pointer to X, while the latter implies changing X to be a pointer itself and using its pointer value.)
- What do I expect to happen when the underlying value of the pointer changes?

While working on the problem in this post, I also learned about the [memory layout of structs](https://research.swtch.com/godata) and [how structure padding affects the sizes of structs](https://go101.org/article/memory-layout.html), both of which are relevant to understanding how structs and pointers work in Go.
