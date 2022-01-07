---
title: 'Building an Expression Evaluator'
date: 2021-02-22T04:30:55Z
draft: false
tags: [algorithms, javascript]
slug: evaluator
aliases: [/evaluator]
thumbnail: 'https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_300/v1640476018/Blog/pexels-monstera-6238068.webp'
images:
  [
    'https://res.cloudinary.com/cwilliams/image/upload/v1640476018/Blog/pexels-monstera-6238068.webp',
  ]
---

In a spreadsheet application, like Microsoft Excel or Google Sheets, you can enter an expression like `=3 + 5 * 3 - 8` into a cell and calculate the result by pressing `ENTER`.

We call programs like that—programs that receive an arithmetic expression and return its value—expression evaluators. And today, we're going to build one.

By the end of this post, we'll have written a JavaScript function, `evaluate`, which can perform simple arithmetic: addition, subtraction, multiplication, division, exponentiation.

{{< video src="https://res.cloudinary.com/cwilliams/video/upload/c_crop,w_473,x_3,y_3/v1613991599/Blog/evaluator_demo.mp4" title="Demo of the online evaluator" >}}

## Just `eval()`?

[`eval`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval) is a function on the JavaScript global object that evaluates JavaScript code. Arithmetic expressions like `3 + 5 * 3 - 8` are valid JavaScript code. And so, we can simply tell our program to call `eval(expression)` and call it a day.

However, what we want to do is implement `eval` ourselves, albeit a much simpler version. Later on, we'll even extend our evaluator to support expressions that aren't valid JavaScript code, essentially building a simple language of our own.

If that sounds exciting, let's kick things off!

## Stages of the evaluation

We'll break down our evaluation process into three stages.

In the first stage, we'll extract the numbers and arithmetic operators from the expression and return an array of the _tokens_. In the second stage, we'll convert the tokens from infix notation to Reverse Polish notation (RPN). (We'll find out what those notations mean in a minute.) And in the final stage, we'll evaluate the RPN expression and return the resulting value.

![Stages of the expression evaluator](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_900,f_auto/v1613925510/Blog/expression-evaluator-diagram.webp)

## Tokenization

In the first stage of evaluation, we'll convert the expression string into an array of tokens. A token is the smallest, meaningful unit of an expression, like a number or a mathematical operator.

For example, the expression `1 + 45 * (3 + 2)` contains the following tokens:

```jsx
[1, '+', 45, '*', '(', 3, '+', 2, ')'];
```

You may notice that we ignored whitespace characters in the list of tokens. We sometimes use white space to separate other tokens. But it has no impact on the result of the expression, so we don't need it for the rest of the evaluation.

We'll start the tokenization step by initializing:

1. a scanner to keep track of our current position in the expression string, and
2. an array to store the tokens we find.

```jsx
function tokenize(input) {
  let scanner = 0;
  const tokens = [];

  while (scanner < input.length) {
    const char = input[scanner];

    // ...
  }
}
```

If the current character is a digit, we'll look for subsequent characters that are either digits or a decimal point. We'll convert the digits into a number, push the number into the `tokens` array, and then continue scanning.

```jsx
if (/[0-9]/.test(char)) {
  let digits = '';

  // Starting from the current position, check if there are more
  // digits that make up a single number and parse them all as one
  while (scanner < input.length && /[0-9\.]/.test(input[scanner])) {
    digits += input[scanner++];
  }

  const number = parseFloat(digits);
  tokens.push(number);
  continue;
}
```

If the current character is a mathematical symbol, we'll push the symbol to the `tokens` array and continue scanning.

```jsx
if (/[+\-/*()^]/.test(char)) {
  tokens.push(char);
  scanner++;
  continue;
}
```

If the current character is a whitespace character, we'll skip over it as we've already discussed.

```jsx
if (char === ' ') {
  scanner++;
  continue;
}
```

If the current character is neither a number nor a symbol nor whitespace, we can throw an error.

```jsx
throw new Error(`Invalid token ${char} at position ${scanner}`);
```

After scanning the entire expression string, we'll return all the tokens.

## Infix and Polish notations

The second and third stages of evaluation involve converting the tokens from infix notation to Reverse Polish notation (RPN) and then evaluating the RPN expression.

**Infix notation** is the notation commonly used in arithmetic expressions. In infix notation, we place operators **between** their operands. For example, to add 1 and 5, we write `1 + 5`.

When using infix notation, it is sometimes necessary to use parentheses to indicate the order of performing operations. For example, to add 3 and 4 together and multiply the result by 5, we write `(3 + 4) * 5`.

Without the parentheses, precedence rules determine the order of evaluating the expression[^nds]. Using these precedence rules, we would evaluate the expression `3 + 4 * 5` differently: first, multiplying 4 by 5 and then adding the result to 3.

As a result, a program that evaluates an infix expression needs to do extra work to decide the order of the operations. Instead of simply evaluating the expression from left to right, it may need to check the full expression to see if there are parts of the expression enclosed in parentheses that should be evaluated first.

To avoid this need for parentheses, computer scientists developed two other types of arithmetic notations[^mee]. In **prefix notation**, also known as **Polish notation**, operators **precede** their operands. And in **postfix notation**, or **Reverse Polish notation**, operators **follow** their operands. For example, the infix expression, `1 + 5`, may be represented as `+ 1 5` in prefix notation and `1 5 +` in postfix notation.

Polish and Reverse Polish notations have the advantage of not requiring parentheses to represent the order of evaluating expressions. Both notations innately express the order of operations and can simply be evaluated from right to left (for Polish notation) or left to right (for Reverse Polish notation). We'll see how in the next section.

## Evaluating RPNs

For our program, we'll use the left-to-right or Reverse Polish notation.

Let's take a few examples here to see how to evaluate expressions in infix and Reverse Polish notations. Then we'll learn how to convert infix expressions into RPN in the next section.

To evaluate the infix expression: `3 + 2 * (4 - 1)`, we:

1. Subtract 1 from 4 to get 3
2. Multiply 3 (from step 1) by 2 to get 6
3. Add 6 (from step 2) to 3 to get 9

Notice that we followed precedence rules—brackets first (hence, subtraction), then multiplication, then addition—instead of simply calculating from left to right.

The RPN equivalent of the expression is `3 2 4 1 - * +`. (We haven't yet learned to convert an infix expression to RPN. But take my word on this for now.)

You may notice that, unlike in the infix expression, the operators in the RPN expression appear in the correct order of evaluation from left to right. Subtraction shows up first, then multiplication, then addition.

To evaluate an RPN expression, we **read it from left to right** and **operate when the first two operands of each operator are available**.

In the expression, `3 2 4 1 - * +`, the first operator we find with both its operands available is the subtraction operator. So we subtract 1 from 4.

```jsx
3 2 4 1 - * +
    ^^^^^
```

We'll perform the same walk and then multiply 2 and 3 together.

```jsx
3 2 3 * +
  ^^^^^
```

Finally, we'll add 3 and 6 together to give us 9.

```jsx
3 6 +
```

Let's take a slightly different expression to illustrate this further. This time, we'll remove the brackets in the expression: `3 + 2 * 4 - 1`.

To evaluate this infix expression, we would:

1. Multiply 2 by 4 to get 8
2. Add 3 to 8 (from step 1) to get 11
3. Subtract 1 from 11 (from step 2) to get 10

Again, here we followed precedence rules—multiplication first, then addition, then subtraction—instead of calculating from left to right.

The RPN equivalent of this expression is `3 2 4 * + 1 -`. And again, you may notice that the operators are in the correct evaluation order from left to right: multiplication shows up first, then addition, then subtraction.

We'll evaluate this RPN as before: moving from left to right, we'll find the first operator with two available operands. So we'll multiply 2 by 4 first.

```jsx
3 2 4 * + 1 -
  ^^^^^
```

Next, we'll add 3 and 8.

```jsx
3 8 + 1 -
^^^^^
```

Finally, we'll subtract 1 from 11 to get 10.

```jsx
11 1 -
```

We can now see that RPN expressions have the same result as their infix equivalents.

Take a few moments to study the table below to see how RPN expresses the order of operations using the position of the operators instead of parentheses.

| Infix notation    | Evaluation order                          | Reverse Polish notation |
| ----------------- | ----------------------------------------- | ----------------------- |
| `3 + 2 * (4 - 1)` | Subtraction -> Multiplication -> Addition | `3 2 4 1 - * +`         |
| `3 + 2 * 4 - 1`   | Multiplication -> Addition -> Subtraction | `3 2 4 * + 1 -`         |
| `(3 + 2) * 4 - 1` | Addition -> Multiplication -> Subtraction | `3 2 + 4 * 1 -`         |

### Evaluating with a stack

In the RPN evaluation process we just described, we jumped back to the start of the expression after each step to read from left to right again. But we can use a stack instead to store the values we are not yet ready to evaluate.

Reading the expression from left to right:

1. If the next token is a number, push the value to the stack
2. If the next token is an operator, pop the last two numbers from the stack and push the result of operating on them to the stack

For the RPN expression `3 2 + 4 * 1 -`, the initial values of the RPN and the stack would be:

```jsx
rpn = [3, 2, '+', 4, '*', 1, '-'];
stack = [];
```

We'll push the first two values from the RPN on to the stack.

```jsx
rpn = ['+', 4, '*', 1, '-'];
stack = [3, 2];
```

Since the next token is an operator, we'll pop the last two elements from the stack (2 and 3) add the first to the second, and push the result (5) back on to the stack.

```jsx
rpn = [4, '*', 1, '-'];
stack = [5];
```

Next, we'll push the value 4 to the stack.

```jsx
rpn = ['*', 1, '-'];
stack = [5, 4];
```

Again, we have an operator next, so we'll pop the last two elements from the stack (4 and 5), multiply the first by the second, and push the result (20) back onto the stack.

```jsx
rpn = [1, '-'];
stack = [20];
```

Pushing the value 1 to the stack, we get:

```jsx
rpn = ['-'];
stack = [20, 1];
```

Popping the last two elements from the stack (1 and 20), subtracting the first from the second, and pushing the result (19) back on to the stack:

```jsx
rpn = [];
stack = [19];
```

We have no more tokens left in the expression. The value at the top of the stack (19) is the result of the evaluation.

Converting this process into code:

```jsx
function evaluate(rpn) {
  const stack = [];

  for (let scanner = 0; scanner < rpn.length; scanner++) {
    const token = rpn[scanner];

    if (/[+\-/*^]/.test(token)) {
      stack.push(operate(token, stack));
      continue;
    }

    // token is a number
    stack.push(token);
  }

  return stack.pop();
}

function operate(operator, stack) {
  const a = stack.pop();
  const b = stack.pop();

  switch (operator) {
    case '+':
      return b + a;
    case '-':
      return b - a;
    case '*':
      return b * a;
    case '/':
      return b / a;
    case '^':
      return Math.pow(b, a);
    default:
      throw new Error(`Invalid operator: ${operator}`);
  }
}
```

## Converting from infix to RPN

We now know what Reverse Polish notation is and how to evaluate RPN expressions. Well done on making it this far.

Next, we'll see how to convert expressions written in infix notation to RPN using a process known as the **shunting-yard algorithm**[^njo].

Remember that RPN places the operators in an expression in the correct order of evaluation. So the goal of the shunting-yard algorithm is to read through an infix expression and then place the operators in their correct position according to precedence rules.

### A simple infix expression

Let's consider a few examples, starting with the infix expression `3 * 4 + 1`.

The RPN equivalent of the expression is `3 4 * 1 +`. (Don't take my word for it this time—try evaluating them both.)

First, we'll set up two arrays, `out` and `operators`. `out` would hold the final RPN expression, while `operators` would be a temporary store for, well, operators, before we add them to their correct positions in the RPN.

The first token in the infix expression is a number, so we'll push it to `out`.

```jsx
// >3< * 4 + 1
operators = [];
out = [3];
```

The next token is the operator `*`. We can't yet tell whether the multiplication operation should be done first in the expression (though peeking at the complete infix expression, we know it very well should). So we'll push the operator to `operators` till we know for sure.

```jsx
// 3 >*< 4 + 1
operators = ['*'];
out = [3];
```

We'll push the next token, 4, to `out`:

```jsx
// 3 * >4< + 1
operators = ['*'];
out = [3, 4];
```

The next token is the operator `+`. This time, before pushing the operator to `operators`, we need to check whether to first add any of its contents to `out`.

**If the operators already in `operators` have an equal or higher precedence than the next operator, then they should be positioned before the next operator in the final expression.** We would first pop them from `operators` and push them on to `out` (we call this process _unwinding_ `operators` on to `out`). And then push the next operator to `operators` as before.

**But, if the operators already in `operators` have lower precedence than the next token, then the next operator should be positioned before them in the final expression.** So we'll simply push the next operator to `operators` as before.

**Exponentiation has higher precedence than multiplication and division, which, in turn, have higher precedence than addition and subtraction.**

In this case, the operator in `operators`, `*`, has higher precedence than the next token, `+`. So, we'll move `*` to `out` and then push the current operator, `+`, to `operators`.

```jsx
// 3 * 4 >+< 1
operators = ['+'];
out = [3, 4, '*'];
```

The next token is a number and we'll push it to the `out` stack.

```jsx
// 3 * 4 + >1<
operators = ['+'];
out = [3, 4, '*', 1];
```

We have no more tokens left in the infix expression. And we know that the operators left in `operators`, if any, are in a specific evaluation order: operators with higher precedence were most recently pushed (or, in other words, at the top of the stack). So we can unwind all the contents of `operators` on to `out` to get the final RPN expression.

```jsx
out = [3, 4, '*', 1, '+'];
```

### An infix expression with parentheses

We'll now consider one more example—one that's a little more complex: `3 * (4 - 2) + 1 * 5`.

To evaluate this infix expression, we evaluate the section enclosed in parentheses first. The parentheses act like an operator with precedence higher than all the others. The complete evaluation order would be:

1. Subtract 2 from 4
2. Multiply the result with 3, to get 6
3. Multiply 1 and 5
4. Add the results of steps 2 and 3

The RPN of the expression is `3 4 2 - * 1 5 * +`. (Again, take a moment to try evaluating this expression.)

To convert from the infix notation to the RPN, we'll set up `operators` and `out` as before. Then, we'll push the first token, 3, to `out`, and the next one, `*`, to the `operators` stack.

```jsx
// 3 >*< ( 4 - 2 ) + 1 * 5
operators = ['*'];
out = [3];
```

The next token is the left parenthesis symbol. The symbol isn't a mathematical operator, but we'll use it as a placeholder to decide when to unwind the stack. Let's push this to the `operators` stack for now.

```jsx
// 3 * >(< 4 - 2 ) + 1 * 5
operators = ['*', '('];
out = [3];
```

We'll push the next token, `4`, to the `out` stack. And on the next token, `-`, we need to decide whether or not to unwind the `operators` stack. The operator at the top of the stack is the left parenthesis symbol. We use the left parenthesis symbol only as a placeholder in the stack, so we'll skip unwinding and only push the operator, `-`, to the stack.

```jsx
// 3 * ( 4 >-< 2 ) + 1 * 5
operators = ['*', '(', '-'];
out = [3, 4];
```

Next, we'll push 2 to `out`. The next token is the right parenthesis symbol. When we meet a right parenthesis, we'll unwind all the operators in the `operators` stack till we meet a left parenthesis, and then we'll discard both the right and left parentheses.

```jsx
// 3 * ( 4 - 2 >)< + 1 * 5
operators = ['*'];
out = [3, 4, 2, '-'];
```

Take some time to think about what we've just done. By adding the left parenthesis as a placeholder, we paused unwinding the stack till we reached the right parenthesis. The parentheses said to the previous contents of the stack: _hold on, let our contents go first_.

For the next token, `+`, we first check to see if the operator at the top of the `operators` stack has an equal or higher precedence. It does, so we'll unwind it on to `out` and then push `+` to the `operators` stack.

```jsx
// 3 * ( 4 - 2 ) >+< 1 * 5
operators = ['+'];
out = [3, 4, 2, '-', '*'];
```

We'll then push `1` to `out`. The token after that is `*`. The operator at the top of the `operators` stack, `+`, has lower precedence than `*`. So we'll push `*` to the stack without unwinding.

```jsx
// 3 * ( 4 - 2 ) + 1 >*< 5
operators = ['+', '*'];
out = [3, 4, 2, '-', 1];
```

There are no other tokens in the infix expression, so we'll unwind all the operators in the stack on to `out`.

```jsx
out = [3, 4, 2, '-', 1, '*', '+'];
```

At this point, we understand enough about converting infix expressions to RPN to translate the process into code.

```jsx
function toRPN(tokens) {
  const operators = [];
  const out = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (typeof token === 'number') {
      out.push(token);
      continue;
    }

    if (/[+\-/*<>=^]/.test(token)) {
      while (shouldUnwindOperatorStack(operators, token)) {
        out.push(operators.pop());
      }
      operators.push(token);
      continue;
    }

    if (token === '(') {
      operators.push(token);
      continue;
    }

    if (token === ')') {
      while (operators[operators.length - 1] !== '(') {
        out.push(operators.pop());
      }
      operators.pop();
      continue;
    }

    throw new Error(`Unparsed token ${token} at position ${i}`);
  }

  for (let i = operators.length - 1; i >= 0; i--) {
    out.push(operators[i]);
  }

  return out;
}

const precedence = { '*': 2, '/': 2, '+': 1, '-': 1 };

function shouldUnwindOperatorStack(operators, nextToken) {
  if (operators.length === 0) {
    return false;
  }

  const lastOperator = operators[operators.length - 1];
  return precedence[lastOperator] >= precedence[nextToken];
}
```

## Conclusion

We now have all the pieces of the puzzle to build our complete evaluator: a function to tokenize an infix expression string, another to convert the tokens into RPN, and another to evaluate the RPN expression. We've come a long way, you and I.

All that's left to do now is put all three functions together.

```jsx
function evaluate(input) {
  return evalRPN(toRPN(tokenize(input)));
}
```

The program we've built can evaluate expressions containing simple arithmetic: addition, multiplication, division, subtraction, exponentiation. But the fun has just begun. In the next article, we'll extend the evaluator to support conditionals, functions, and environments.

In the meantime, try out [the evaluator online](https://chidiwilliams.github.io/expression-evaluator/) or check out [the code on GitHub](https://github.com/chidiwilliams/expression-evaluator/blob/main/simple.js).

## Notes

[^nds]: Depending on where you grew up, you may have once used a mnemonic like BODMAS, PEMDAS, or BEDMAS to memorize these precedence rules.
[^mee]: The logician Jan Łukasiewicz invented the Polish notation in 1924. Two groups of computer scientists independently invented the Reverse Polish notation: Arthur Burks, Don Warren, and Jesse Wright in 1954, and Friedrich Bauer and Edsger Dijkstra in the early 1960s.
[^njo]: Edsger Dijkstra invented the shunting-yard algorithm and first described it in his [1961 Mathematisch Centrum report](https://ir.cwi.nl/pub/9251).
