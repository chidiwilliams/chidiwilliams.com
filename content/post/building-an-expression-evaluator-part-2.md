---
title: 'Building an Expression Evaluator (continued)'
date: 2021-03-17T08:00:00Z
draft: false
tags: [algorithms, javascript]
url: evaluator-2
---

In my [previous post](/evaluator/), we explored how expression evaluation works and built a program, `evaluate`, that returns the result of an arithmetic expression.

Here, we'll extend the evaluator with a few more features. We'll add support for predefined functions, like `MAX` and `SQRT`. Then, we'll add relational operations: three new operators (`<`, `>`, `=`) and an `IF` function. And finally, we'll create an environment: a place to store and retrieve the results of an expression.

Let's start with a recap of the evaluation process. In the first stage of evaluation, we extract the tokens in the arithmetic expression string. Tokens are the meaningful units of an expression. Numbers and symbols are tokens, but whitespace characters aren't.

```js
tokenize('2 + 3 * (5 + 4)'); // [2, '+', 3, '*', '(', 5, '+', 4, ')']
```

In the second stage, we convert the tokens from **infix notation** to **Reverse Polish notation (RPN)**. In infix notation, which you are probably more familiar with, we place operators _between_ their operands. For example, `1 + 2`. In RPN, also called postfix notation, we place operators _after_ their operands. For example, `1 2 +`.

Unlike infix notation, RPN doesn't need parentheses to indicate the order of evaluation of an expression. And so, it's easier to evaluate than infix notation.

```js
toRPN([2, '+', 3, '*', '(', 5, '+', 4, ')']); // [2, 3, 5, 4, '+', '*', '+']
```

In the final stage, we evaluate the RPN expression.

```js
evalRPN([2, 3, 5, 4, '+', '*', '+']); // 29
```

## Functions

We'll predefine two functions in the evaluator: `MAX` and `SQRT`. `MAX(a, b)` will return the larger of `a` and `b`, while `SQRT` will return the square root of `a`.

```js
evaluate('45 + SQRT(9)'); // 48
evaluate('3 * MAX(4, 19)'); // 57
```

### Tokenizing function names

In the tokenization stage, we need to parse two new types of tokens: function names (like `SQRT`) and the comma symbol that separates function arguments.

A valid function name may contain one or more uppercase letters. In `tokenize`, if we find an uppercase letter in the expression, we'll check for the other characters that form the name and push them as a single string to the list of tokens.

```js
if (/[A-Z]/.test(char)) {
  let name = '';

  while (scanner < input.length && /[A-Z]/.test(input[scanner])) {
    name += input[scanner++];
  }

  tokens.push(name);
  continue;
}
```

If the current token is a comma, we'll push it to the tokens array, as we do the other symbols.

```js
if (/[+\-/*(),^]/.test(char)) {
  tokens.push(char);
  scanner++;
  continue;
}
```

### Evaluating RPNs with function names

After tokenization, we need to convert the tokens to RPN and then evaluate the RPN expression. But we don’t yet know how RPN expressions that contain function names look. Let's try to figure that out first.

We'll take `MAX(4, 19) * 3` as an example. To evaluate this expression, we would:

1. Get the maximum value of 4 and 19, which is 19
2. Multiply 19 by 3 to get 57

Looking closely at these two steps, you'll notice that we use `MAX` and `*` similarly. We "max 4 and 19" like we "multiply 19 and 3". Functions work just like operators: they return the result of operating on arguments (or operands).

So, we can represent `MAX(4, 19) * 3` in RPN as `4 19 MAX 3 *`.

Remember that, to evaluate an RPN expression, we perform operations from left to right till we get a final value. When we find a number in the expression, we push it to a stack. When we find an operator, we pop the topmost two numbers in the stack, operate on them, and then push the result back onto the stack. At the end of the expression, we return the last result left in the stack.

```js
function evalRPN(rpn) {
  const stack = [];

  for (let i = 0; i < rpn.length; i++) {
    const token = rpn[i];

    if (/[+\-/*^]/.test(token)) {
      stack.push(operate(token, stack));
      continue;
    }

    if (typeof token === 'number') {
      stack.push(token);
      continue;
    }
  }

  return stack.pop();
}
```

When the current token in the expression is a function name, we'll call a function called `apply`. And then, we'll push its result back to the stack (just like we do with operators).

```js
if (/^[A-Z]/.test(token)) {
  stack.push(apply(token, stack));
  continue;
}
```

`apply` works very much like `operate`. We'll pop the function's arguments from the stack, and then return the result of applying the function to the arguments.

```js
function apply(func, stack) {
  if (func === 'MAX') {
    const b = stack.pop();
    const a = stack.pop();
    return Math.max(a, b);
  }

  if (func === 'SQRT') {
    const a = stack.pop();
    return Math.sqrt(a);
  }

  throw new Error(`Undefined function: ${func}`);
}
```

### Converting infix expressions with function names to RPN

Finally, we'll see how to convert infix expressions containing function names to RPN.

```js
toRPN(['MAX', '(', 4, ',', 19, ')', '*', 4]); // [4, 19, 'MAX', 4, '*']
```

Let's start by reviewing how we convert infix expressions to RPN.

```js
function toRPN(tokens) {
  // First, we set up a stack to hold operators that should
  // not yet be in the final RPN expression
  const operators = [];

  // ... and an array to hold the final expression
  const out = [];

  // For each token in the infix expression...
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // If the token is a number, we'll push it onto `out`
    if (typeof token === 'number') {
      out.push(token);
      continue;
    }

    // If the token is an operator...
    if (/[+\-/*^]/.test(token)) {
      // While there are operators in `operators` with higher precedence than
      // the current token, we'll unwind them onto `out`
      while (shouldUnwindOperatorStack(operators, token)) {
        out.push(operators.pop());
      }

      // Then we'll push the token to `operators`
      operators.push(token);
      continue;
    }

    // If the token is a left parenthesis symbol, we'll push it to `operators`
    if (token === '(') {
      operators.push(token);
      continue;
    }

    // If the token is a right parenthesis symbol...
    if (token === ')') {
      // While there are operators in `operators` and we haven't yet reached the
      // last left parenthesis, we'll unwind them onto `out`
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        out.push(operators.pop());
      }

      // Then we'll remove the last left parenthesis
      operators.pop();
      continue;
    }
  }

  // Finally we'll unwind all the remaining operators onto `out`
  for (let i = operators.length - 1; i >= 0; i--) {
    out.push(operators[i]);
  }

  // And then return `out`
  return out;
}
```

Now, we need this function to handle function names and commas. As we've already seen, functions in the RPN expression act like operators. When the current token in the infix expression is a function name, we'll push it to the `operators` stack.

```js
if (/[A-Z]/.test(token)) {
  operators.push(token);
  continue;
}
```

Remember that in `shouldUnwindOperatorStack(operators, token)`, we check whether the topmost operator in the `operators` stack has higher precedence than `token`. If it does, we pop it out of the `operators` stack and push it onto `out`.

We need to decide what the precedence of a function is. In an expression like `5 * MAX(4, 2)`, we evaluate the function before the multiplication. Functions have higher precedence than their neighboring mathematical operators. We'll unwind the `operators` stack if the topmost operator is a function, regardless of whatever `nextToken` is.

```js
const precedence = { '^': 3, '*': 2, '/': 2, '+': 1, '-': 1 };

function shouldUnwindOperatorStack(operators, nextToken) {
  if (operators.length === 0) {
    return false;
  }

  const lastOperator = operators[operators.length - 1];
  return (
    /[A-Z]/.test(lastOperator) || // unwind, if lastOperator is a function
    precedence[lastOperator] >= precedence[nextToken]
  );
}
```

Next, we'll take a look at commas. To evaluate the infix expression, `3 * MAX(1 + 4, 2 - 8)`, we would:

1. Add 1 and 4 together to get 5
2. Subtract 8 from 2 to get -6
3. Get the maximum value of 5 (from step 1) and -6 (from step 2), which is 5
4. Multiply 3 by 5 to get 8

We can represent this evaluation with the RPN: `3 1 4 + 2 8 - MAX *`. Looking closely, we see that the comma in the infix expression behaves like a closing parenthesis. The sub-expression between the comma and the opening parenthesis, `1 + 4`, has higher precedence than the operations before it. (In other words: we evaluate sub-expressions that are function arguments before evaluating the function itself.)

Just like the closing parenthesis, when the current token in `toRPN` is a comma, we would unwind the operators in the stack until we get to the most recent opening parenthesis. However, we won't pop out the opening parenthesis from the stack. We'll leave that for the closing parenthesis to do.

```js
if (token === ',') {
  while (operators.length > 0 && operators[operators.length - 1] !== '(') {
    out.push(operators.pop());
  }
  continue;
}
```

## Relational operations

In this next section, we'll implement three relational operations: less than (`<`), greater than (`>`), and equal to (`=`); and a function, `IF(a, b, c)`, which returns `b` if `a` is true, or `c` if it isn't.

We'll start by extending the list of valid operators in the evaluator. `/[+\-/*(),^]/` becomes `/[+\-/*(),^<>=]/`. Then, in the RPN evaluation stage, we'll add the implementations of the relational operators.

```js
function operate(operator, stack) {
  const b = stack.pop();
  const a = stack.pop();

  switch (operator) {
    // ...

    case '<':
      return a < b;
    case '>':
      return a < b;
    case '=':
      return a === b;
  }
}
```

And next, we'll implement `IF(a, b, c)` in the `apply` function we wrote in the first section.

```js
function apply(func, stack) {
  // ...

  if (func === 'IF') {
    const ifFalse = stack.pop();
    const ifTrue = stack.pop();
    const predicate = stack.pop();
    return predicate ? ifTrue : ifFalse;
  }
}
```

## Variables

In this final section, we'll implement an environment in the evaluator. An **environment** is a collection of **variables** and their corresponding values.

Let's initialize the environment with a few handy math constants.

```js
const environment = {
  PI: Math.PI,
  E: Math.E,
};
```

### Accessing variables

To access a variable from the environment, we'll use a dollar sign followed by the name of the variable. For example, to calculate the area of a circle with a radius of 5:

```js
evaluate('$PI * 5 * 5'); // 78.5398...
```

#### Tokenizing variable names

In `tokenize`, we'll extend the regex that matches function names to also match variable names. `/[A-Z]/` becomes `/[A-Z$]/`.

```js
tokenize('$PI + 34'); // ['$PI', '+', 34]
```

#### Converting infix expressions with variable names to RPN

In the next stage of the evaluation, we convert the infix expression into RPN. Variable names represent values (like numbers), not operations (like operators or functions). So, we'll handle them like numbers.

While converting from infix notation to RPN, when the current token is a variable name, we'll push it to the `out` array.

```js
if (typeof token === 'number' || /^\$/.test(token)) {
  out.push(token);
  continue;
}
```

For the infix expression, `['$PI', '+', 34]`, `toRPN` will return `['$PI', 34, '+']`.

#### Evaluating RPN expressions with variable names

The final stage of the evaluation is where we apply operators and functions to values in the expression. And so it is here that we replace the variable name with its value.

While evaluating the RPN expression, if the current token is a variable name, we'll attempt to get its value from the environment. If the value doesn't exist, we'll throw an error. But if it does, we'll push the value onto the stack.

```js
if (/^\$/.test(token)) {
  const value = environment[token.slice(1)]; // .slice(1) removes the '$' character

  if (value === undefined) {
    throw new Error(`${token} is undefined`);
  }

  stack.push(value);
  continue;
}
```

After updating all three sections, our program is now able to evaluate expressions that contain variables from the environment.

```js
evaluate('$PI * 78 + $E'); // 247.7625088084629
```

### Setting variables

Next, we'll look at a way to set and change the values of variables. We'll add a function, `SET(#X, Y)`, which sets the value of variable `X` to `Y`.

_Why do we use a different syntax, `#X`, to reference variable `X` when we already have `$X`?_

The distinction between `$X` and `#X` is that `$X` represents **the value of the variable**. If we evaluate the expression, `SET($X, 50)`, the evaluator will attempt to get the value of `X` from the environment and then try to set the value of that value to 50. If `$X` was previously 20, `SET($X, 50)` becomes `SET(20, 50)`. That's not what we want.

What we want is a way to point to **the place of the variable**. `SET(#X, Y)` means: set the value of the place called `X` to `Y`. We'll refer to `#X` as a variable pointer to `X`.

(We can use both a variable and its pointer in an expression. For example, `SET(#X, $X + 1)` increments the value of `X` by 1.)

#### Tokenizing variable pointer names and SET

We'll parse the variable pointer name like we parse function names and variable names. We'll add the hash character, `#`, to the regex that matches names in `tokenize()` and `toRPN()`.

```js
tokenize('SET(#X, 50)'); // ['SET', '(', '#X', ',', 50, ')']
toRPN(['SET', '(', '#X', ',', 50, ')']); // ['#X', 50, 'SET']
```

#### Evaluating RPN expressions with variable pointer names and SET

Remember that in `evalRPN`, when the current token is a number, we push the number to the stack for the operators and functions to pick up. We'll do the same for the variable pointer names so that `SET` picks them up.

```js
if (typeof token === 'number' || /^\#/.test(token)) {
  stack.push(token);
  continue;
}
```

In the implementation of `SET`, we'll pop the last two items from the stack, which will be the variable name and its new value. We'll update the environment and then return the value we set.

```js
if (func === 'SET') {
  const value = stack.pop();
  const key = stack.pop();
  environment[key.slice(1)] = value; // .slice(1) removes the '#' character
  return value;
}
```

## Conclusion

We added a handful of features to the evaluator in this post. Our nifty, little program can now evaluate predefined functions, relational operations, and variables.

There are many more places to go in the world of expression evaluators: [string primitives](https://www.vertex42.com/blog/excel-formulas/text-formulas-in-excel.html#len), [other predefined functions](https://support.microsoft.com/en-us/office/excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188), [lambdas](https://www.microsoft.com/en-us/research/blog/lambda-the-ultimatae-excel-worksheet-function/), and more. But I'll have to leave them up to you to explore. Thanks for reading.

Try out [the evaluator online](https://chidiwilliams.github.io/expression-evaluator/) or check out [the complete code on Github](https://github.com/chidiwilliams/expression-evaluator/blob/main/evaluator.js).
