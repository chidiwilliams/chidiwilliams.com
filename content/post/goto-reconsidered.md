---
title: 'GOTO Reconsidered'
date: 2021-03-24T08:00:00+00:00
draft: true
tags: [basic, c, assembly]
---

I wrote my very first program in BASIC. My father had bought a DVD from Computer Village[^dwe] that had a compilation of compilers and tutorials for different programming languages. There were compilers for BASIC, Fortran, COBOL, and Pascal.

[^dwe]: Computer Village is a place in Lagos, Nigeria where eletronics, computers, phones, etc are sold.

My very first program looked like this:

```basic
PRINT "Hello World"
```

Gradually I learned about more concepts: comments, variables, how to receive user input, [math expressions](/evaluator), conditional statements, and more. Somewhere between then and the rest of my journey learning BASIC, I learned about a construct known as the `GOTO` statement.

In BASIC, you could assign a number to a line of code, and `GOTO` let you jump to that line. For example, this program prompts the user till they enter an even number.

```basic
10 INPUT "Enter an even number: ", n
20 IF n MOD 2 = 0 THEN
30 PRINT "Thank you!"
35 PRINT "qw!"
40 ELSE
50 GOTO 10
60 END IF
```

## What is GOTO?

The GOTO statement jumps from the current line in a program to another line. It performs a one-way transfer of control (which is to say, it does not return back control to the current line, like a function call).

`GOTO label` jumps to the line labelled with `label`. In BASIC, we can label line with line numbers. For example, this BASIC program prints out successive integers counting from 1.

```basic
10 LET X = 1
20 LET X = X + 1
30 PRINT X
40 GOTO 20
```

You can also combine the `GOTO` statement with a conditional statement to perform a conditional transfer of control: `IF condition THEN GOTO label`. For example, this program prints out the first 20 numbers in the Fibonacci series.

```basic
10 LET A = 0
20 LET B = 1
30 LET SUM = 0
40 LET N = 20
50 PRINT A
60 LET SUM = A + B
70 LET A = B
80 LET B = SUM
90 LET N = N - 1
100 IF N > 0 THEN GOTO 50
```

Apart from line numbers, you can also use GOTOs to jump to a labelled section of code. For example, this C program also prints out the first 20 Fibonacci numbers.

```c
#include <stdio.h>

void main()
{
    int a = 0, b = 1, sum = 0, n = 20;

nextFib:
    if (n > 0) {
        printf("%d\n", a);
        sum = a + b;
        a = b;
        b = sum;
        n--;
        goto nextFib;
    }
}
```

## GOTOs in assembly code

GOTOs are compiled into jump assembly instructions. This C program that prints successive positive integers...

```c
void main()
{
    int x = 1;

next:
    x++;
    printf("%d", x);
    goto next;
}
```

...compiles into this assembly code[^jek]:

[^jek]: Compiled with x86-64 gcc 10.2

```asm
; "local label" which stores the string constant we'll use to print later
.LC0:
        .string "%d"

; label for the start of the main function
main:
        ; prepare the stack and registers for use
        push    rbp
        mov     rbp, rsp
        sub     rsp, 16

        ; move 1 into 4 bytes starting at the address rbp-4
        ; rbp-4 represents the variable x
        mov     DWORD PTR [rbp-4], 1

; label for "next"
.L2:
        ; add 1 to the 4 bytes stored at the address rbp-4
        add     DWORD PTR [rbp-4], 1

        ; print the 4 bytes stored in rbp-4 using the string constant in .LC0
        mov     eax, DWORD PTR [rbp-4]
        mov     esi, eax
        mov     edi, OFFSET FLAT:.LC0
        mov     eax, 0
        call    printf

        ; jump back to .L2
        jmp     .L2
```

We call the statement in the last line, `jmp`, an unconditional jump statement. It tells the machine to return to the section of code marked `.L2`.

### Looping with GOTOs

From this example, and the ones in the previous section, you may have noticed something peculiar about how we use GOTOs. We use GOTOs to repeat a process, just like we do with loop statements like `for` and `while`. Indeed, we can rewrite the previous example using a while loop.

```c
void main()
{
    int x = 1;

    while (1) {
        x++;
        printf("%d", x);
    }
}
```

This code doesn't just print the same output as the version with GOTO. They have the exact same assembly code! The compiler converts this code into a combination of labels and a `jmp` statement, just like it did with the GOTO version.

```asm
.LC0:
        .string "%d"
main:
        push    rbp
        mov     rbp, rsp
        sub     rsp, 16
        mov     DWORD PTR [rbp-4], 1
.L2:
        add     DWORD PTR [rbp-4], 1
        mov     eax, DWORD PTR [rbp-4]
        mov     esi, eax
        mov     edi, OFFSET FLAT:.LC0
        mov     eax, 0
        call    printf
        jmp     .L2
```

In the previous section, we saw an example of a conditional `GOTO`: a `GOTO` combined with an `IF` statement. Let's modify our printing program to print only the first 20 integers.

```c
void main()
{
    int x = 1;

next:
    x++;
    printf("%d", x);
    if (x < 20) goto next;
}
```

And here's the assembly code version of this new program:

```asm
.LC0:
        .string "%d"
main:
        push    rbp
        mov     rbp, rsp
        sub     rsp, 16
        mov     DWORD PTR [rbp-4], 1
.L2:
        ; ...skipping print instructions...

        ; compare 19 and the 4 bytes stored in rbp-4
        cmp     DWORD PTR [rbp-4], 19
        ; ...and, if the result is "greater than" (i.e. the 4 bytes in rbp-4 equal 20 or more), jump to .L3
        jg      .L3
        ; jump to .L2
        jmp     .L2
.L3:
        ; exit the program
        nop
        leave
        ret
```

Here, we see a new type of jump instruction, `jg`. `jg` jumps to a label if the result of the last arithmetic operation was "greater than".

There are a few other conditional jump instructions like `je <label>` (jump when equal), `jne <label>` (jump when not equal), `jl <label>` (jump when less than), and more. These instructions correspond to the combination of GOTOs with `if (a == b)`, `if (a != b)`, `if (a < b)`, respectively, etc.

We can rewrite this conditional GOTO program with a for loop.

```c
void main()
{
    for (int i = 1; i < 20; i++) {
        printf("%d", i);
    }
}
```

Again, this program prints the same output as its GOTO version using similar conditional jump statements.

### Conditional blocks

The conditional jump instructions are also used in the conditional blocks like we have in if-else statements. Here's a program with a simple conditional outside a loop.

```c
int main() {
    int a = 0;
    if (a == 1) {
        a++;
    } else {
        a--;
    }
}
```

This program compiles into the following assembly code instructions.

```asm {linenos=table,hl_lines=["9-10"],linenostart=1}
main:
        push    rbp
        mov     rbp, rsp
        mov     DWORD PTR [rbp-4], 0
        cmp     DWORD PTR [rbp-4], 1
        jne     .L2
        add     DWORD PTR [rbp-4], 1
        jmp     .L3
.L2:
        sub     DWORD PTR [rbp-4], 1
.L3:
        mov     eax, 0
        pop     rbp
        ret
```

Here, `.L2` represents the else block. On the 6th line, we jump to `.L2` if the value of `rbp-4` is not equal to 1. And we make an unconditional jump on the 8th line to jump over the else block since we have completed the instructions for the `if` block.

In a sense, If-elses are GOTOs too.

## The decline of GOTOs

GOTOs were fairly common in the early days of software, but declined in popularity in the 1960s and 1970s with the rise of structured programming. The primary criticism is that code that uses goto statements is harder to understand than alternative constructions. Also leads to unmaintainable spaghetti code.

Structured programming is a programming paradigm aimed at improving the clarity, quality, and development time of a computer program by making extensive use of the structured control flow constructs of selection (if/then/else) and repetition (while and for), block structures, and subroutines.

The structured program theorem proved that the goto statement is not necessary to write programs that can be expressed as flow charts; some combination of the three programming constructs of sequence, selection/choice, and repetition/iteration are sufficient for any computation that can be performed by a Turing machine, with the caveat that code duplication and additional variables may need to be introduced.

In 1968, Edsger Dijkstra wrote a critical letter about GOTOs called [Go To Statement Considered Harmful](http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html). In this letter he argued that GOTO statements make it harder to analyze and verify the correctness of programs. They make it harder to find a meaningful set of coordinates in which to describe the progress of the program. They are "too much an invitation to make a mess of one's program", and should be abolished from all higher-level programs.

## When GOTOs are useful

These examples can be written with structured programming. The structured programming theorem proves... Most of the examples cannot be simplified without introducing a new variable, conditional statement, or loop. It is arguable that these programs are more readable and easier to follow than without GOTOs.

Still Knuth concludes that GOTOs should be abolished from high-level languages to train programmers to formulate their abstractions more carefully.

Sometimes, within the constraint of a particular language and problem, GOTOs can be the optimal—or at least a good way—to solve a task.

### Error handling

In Donald Knuth's response[^jkw] to Dijkstra's letter, he analyzes different ALGOL programs and finds that in some of them, GOTOs are a good way to solve a particular task. One of such tasks is error exits.

[^jkw]: [Structured Programming with go to Statements](https://dl.acm.org/doi/10.1145/356635.356640) (1974)

When an error happens in a program, we might want to skip over the rest of the program and do some cleanup (like deallocating resources and logging the error) instead. In some programming languages, we can perform this cleanup with exceptions and try-catch clauses. For example, in JavaScript:

```javascript
function main() {
  let db;
  try {
    db = connectToDB();
    const result = db.query();
  } catch (err) {
    if (db) db.close();
  }
}
```

At the time when Knuth wrote his letter, the two most common languages, Algol and PL/I, did not have support for structured exception handling with try-catch clauses. C, which is still much commonly in use today, also does not have exceptions or try-catch. In the absence of exceptions, we can use GOTOs to handle errors:

```c
void main(int argc, char **argv)
{
    FILE *f;

    if (argc < 2) {
        fprintf(stderr, "not enough arguments\n");
        goto err;
    }

    f = fopen(argv[1], "r");
    if (f == NULL) {
        fprintf(stderr, "error opening file %s\n", argv[1]);
        goto err;
    }

  // **do things with the file**

  err:
    free(buf);

    return 0;
}
```

### Multi-level breaks

In another case, we might want to jump out of a deeply nested loop. Some languages provide a labeled break statement for this reason. For example, in this JavaScript program, we print two counters till their product is greater than 10, and then we print "done":

```js
function main(a, b) {
  loop1: for (let i = 0; i < 5; i++) {
    loop2: for (let j = 0; j < 5; j++) {
      if (i * j > 10) {
        break loop1;
      }
      console.log(`i = ${i}, j = ${j}`);
    }
  }
  console.log('done');
}
```

A few other languages do not implement multi-level breaks (and continues). And in those languages, GOTOs are useful for jumping out of nested loops. In C, for example, we can rewrite the previous program as:

```c
void main()
{
  for (int i = 0; i < 5; i++) {
    for (int j = 0; j < 5; j++) {
      if (i * j > 10) {
        goto done;
      }
      printf("i = %d, j = %d", i, j);
    }
  }

  done:
  printf("done");
}
```

Here, you might already be thinking of other ways to solve this problem without a GOTO. We could wrap the loops in a separate function and return when we meet the condition, or we could add a Boolean flag. But these other solutions require more work and may be more difficult to read and understand.

### Finite state machines

GOTOs also have a peculiar use case in representing finite state machines. A **finite state machine** is a model of a machine with a fixed number of states. The machine can only be in one state at a time, and can transition from one state to the other based on some input.

## Support for GOTOs

- JavaScript - Break with label
- Python - <https://github.com/snoack/python-goto> <http://entrian.com/goto/> (April Fool's joke)
- Java - Used to have GOTO <https://www.youtube.com/watch?v=9ei-rbULWoA&t=1045s>, labeled loops
- C# - GOTO <https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/goto>
- PHP - GOTO <https://www.php.net/manual/en/control-structures.goto.php> Example: <https://www.php.net/manual/en/control-structures.goto.php#125935>
- C++ - GOTO: <https://en.cppreference.com/w/cpp/language/goto>. If transfer of control enters the scope of any automatic variables (e.g. by jumping forward over a declaration statement), the program is ill-formed (cannot be compiled), unless all variables whose scope is entered have
  - 1. scalar types declared without initializers
  - 2. class types with trivial default constructors and trivial destructors declared without initializers
  - 3. cv-qualified versions of one of the above
  - 4. arrays of one of the above
- C - Same as C++, but with fewer restrictions. In the C programming language, the goto statement has fewer restrictions and can enter the scope of any variable other than variable-length array or variably-modified pointer.
- Go - GOTO <https://golang.org/ref/spec#Goto_statements>
  - Executing the "goto" statement must not cause any variables to come into scope that were not already in scope at the point of the goto. For instance, this example:
  - A "goto" statement outside a block cannot jump to a label inside that block.
- Ruby - Library <https://github.com/bb/ruby-goto>

## Conclusion

Most languages still have a safe form of GOTO. Powerful construct, use wisely.

## Notes
