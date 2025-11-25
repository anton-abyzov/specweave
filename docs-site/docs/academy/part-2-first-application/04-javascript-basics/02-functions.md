---
sidebar_position: 2
title: "04.2 Functions"
description: "Creating reusable blocks of code"
---

# Lesson 04.2: Functions

**Duration**: 45 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will:
- Write and call functions
- Understand parameters and return values
- Use arrow functions
- Know when to use different function styles

---

## What is a Function?

A function is a reusable block of code that performs a specific task.

```javascript
// Without functions (repetitive)
console.log("Hello, Alice!");
console.log("Hello, Bob!");
console.log("Hello, Charlie!");

// With a function (reusable)
function greet(name) {
  console.log(`Hello, ${name}!`);
}

greet("Alice");    // Hello, Alice!
greet("Bob");      // Hello, Bob!
greet("Charlie");  // Hello, Charlie!
```

---

## Function Declaration

### Basic Syntax

```javascript
function functionName(parameter1, parameter2) {
  // Code to execute
  return result;  // Optional
}

// Example
function add(a, b) {
  return a + b;
}

const sum = add(5, 3);  // 8
```

### Parameters vs Arguments

```javascript
// Parameters: Variables in the function definition
function greet(name, greeting) {  // 'name' and 'greeting' are parameters
  return `${greeting}, ${name}!`;
}

// Arguments: Values passed when calling the function
greet("Alice", "Hello");  // "Alice" and "Hello" are arguments
```

### Return Values

```javascript
// Function that returns a value
function multiply(a, b) {
  return a * b;
}
const result = multiply(4, 5);  // 20

// Function without return (returns undefined)
function logMessage(message) {
  console.log(message);
  // No return statement
}
const returned = logMessage("Hi");  // undefined
```

---

## Function Expressions

Functions can be stored in variables:

```javascript
// Function expression
const divide = function(a, b) {
  return a / b;
};

console.log(divide(10, 2));  // 5

// Named function expression (useful for debugging)
const factorial = function calcFactorial(n) {
  if (n <= 1) return 1;
  return n * calcFactorial(n - 1);
};
```

### Difference from Declaration

```javascript
// Function declarations are hoisted (can call before definition)
sayHello();  // Works!
function sayHello() {
  console.log("Hello!");
}

// Function expressions are NOT hoisted
sayGoodbye();  // Error: Cannot access before initialization
const sayGoodbye = function() {
  console.log("Goodbye!");
};
```

---

## Arrow Functions (ES6+)

Modern, concise syntax for functions:

```javascript
// Traditional function
const add = function(a, b) {
  return a + b;
};

// Arrow function (same thing)
const addArrow = (a, b) => {
  return a + b;
};

// Concise arrow (single expression)
const addConcise = (a, b) => a + b;

// Single parameter (parentheses optional)
const double = n => n * 2;

// No parameters (empty parentheses required)
const getTime = () => new Date().toISOString();
```

### When to Use Arrow Functions

```javascript
// ✅ Good for callbacks
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);  // [2, 4, 6, 8, 10]

// ✅ Good for short functions
const isEven = n => n % 2 === 0;

// ⚠️ Careful with 'this' (arrow functions don't have their own 'this')
const obj = {
  name: "Object",
  // Traditional: 'this' refers to obj
  greet: function() {
    console.log(`Hello from ${this.name}`);
  },
  // Arrow: 'this' refers to outer scope (not obj!)
  greetArrow: () => {
    console.log(`Hello from ${this.name}`);  // undefined!
  }
};
```

---

## Default Parameters

```javascript
// Without defaults
function greet(name) {
  return `Hello, ${name}!`;
}
greet();  // "Hello, undefined!"

// With defaults
function greetWithDefault(name = "Guest") {
  return `Hello, ${name}!`;
}
greetWithDefault();         // "Hello, Guest!"
greetWithDefault("Alice");  // "Hello, Alice!"

// Multiple defaults
function createUser(name, role = "user", active = true) {
  return { name, role, active };
}
createUser("Alice");                    // { name: "Alice", role: "user", active: true }
createUser("Bob", "admin");             // { name: "Bob", role: "admin", active: true }
createUser("Charlie", "user", false);   // { name: "Charlie", role: "user", active: false }
```

---

## Rest Parameters

Collect multiple arguments into an array:

```javascript
// Rest parameter (...args)
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}

sum(1, 2);           // 3
sum(1, 2, 3, 4, 5);  // 15

// Mixed parameters
function greetAll(greeting, ...names) {
  return names.map(name => `${greeting}, ${name}!`);
}

greetAll("Hello", "Alice", "Bob", "Charlie");
// ["Hello, Alice!", "Hello, Bob!", "Hello, Charlie!"]
```

---

## Destructuring Parameters

```javascript
// Object destructuring in parameters
function printUser({ name, email, role = "user" }) {
  console.log(`${name} (${email}) - ${role}`);
}

const user = { name: "Alice", email: "alice@example.com" };
printUser(user);  // "Alice (alice@example.com) - user"

// Array destructuring
function printCoordinates([x, y]) {
  console.log(`X: ${x}, Y: ${y}`);
}

printCoordinates([10, 20]);  // "X: 10, Y: 20"
```

---

## Higher-Order Functions

Functions that take or return other functions:

```javascript
// Function that takes a function as argument
function repeat(action, times) {
  for (let i = 0; i < times; i++) {
    action(i);
  }
}

repeat(i => console.log(`Iteration ${i}`), 3);
// Iteration 0
// Iteration 1
// Iteration 2

// Function that returns a function
function createMultiplier(factor) {
  return (number) => number * factor;
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(5));  // 10
console.log(triple(5));  // 15
```

---

## Common Array Methods (use functions)

```javascript
const numbers = [1, 2, 3, 4, 5];

// map: Transform each element
const doubled = numbers.map(n => n * 2);
// [2, 4, 6, 8, 10]

// filter: Keep elements that match
const evens = numbers.filter(n => n % 2 === 0);
// [2, 4]

// find: Get first match
const firstEven = numbers.find(n => n % 2 === 0);
// 2

// reduce: Combine into single value
const sum = numbers.reduce((total, n) => total + n, 0);
// 15

// forEach: Execute for each (no return)
numbers.forEach(n => console.log(n));
// 1, 2, 3, 4, 5
```

---

## SpecWeave Connection

In SpecWeave's `tasks.md`, each task maps to a function:

```markdown
### T-001: Validate user email
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02

#### Implementation Notes
Create a function that:
- Takes email string as parameter
- Returns boolean (valid/invalid)
- Checks format with regex

#### Test Plan (BDD)
- Given email "alice@example.com"
- When validateEmail is called
- Then it returns true
```

This becomes:

```javascript
/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Tests (from BDD scenarios)
console.log(validateEmail("alice@example.com"));  // true
console.log(validateEmail("invalid"));            // false
console.log(validateEmail(""));                   // false
```

Functions implement **one task** with **clear inputs and outputs** — exactly what SpecWeave plans!

---

## Practice Exercise

```javascript
// Exercise 1: Basic Function
// Write a function that calculates the area of a rectangle
// function calculateArea(width, height) { ... }

// Exercise 2: Arrow Function
// Convert to arrow function
// const isPositive = function(number) { return number > 0; };

// Exercise 3: Default Parameters
// Write a function that creates a greeting message
// If no name provided, use "Guest"
// If no greeting provided, use "Hello"
// function createGreeting(name, greeting) { ... }

// Exercise 4: Higher-Order Function
// Write a function that filters an array based on a condition
// function filterArray(array, conditionFn) { ... }
// Usage: filterArray([1,2,3,4,5], n => n > 3)  // [4, 5]
```

<details>
<summary>Solutions</summary>

```javascript
// Exercise 1
function calculateArea(width, height) {
  return width * height;
}
// calculateArea(5, 3) → 15

// Exercise 2
const isPositive = number => number > 0;
// or with explicit return:
// const isPositive = (number) => { return number > 0; };

// Exercise 3
function createGreeting(name = "Guest", greeting = "Hello") {
  return `${greeting}, ${name}!`;
}
// createGreeting() → "Hello, Guest!"
// createGreeting("Alice") → "Hello, Alice!"
// createGreeting("Bob", "Hi") → "Hi, Bob!"

// Exercise 4
function filterArray(array, conditionFn) {
  return array.filter(conditionFn);
}
// filterArray([1,2,3,4,5], n => n > 3) → [4, 5]
// filterArray([1,2,3,4,5], n => n % 2 === 0) → [2, 4]
```

</details>

---

## Key Takeaways

1. **Functions encapsulate reusable logic** — write once, use many times
2. **Use arrow functions for short callbacks** — cleaner syntax
3. **Default parameters prevent undefined errors** — provide sensible defaults
4. **Higher-order functions enable powerful patterns** — map, filter, reduce
5. **Each SpecWeave task becomes a function** — clear inputs → clear outputs

---

## Next Lesson

Now let's learn about arrays and objects — the data structures that organize your data.

→ [Continue to Lesson 04.3: Arrays & Objects](./03-arrays-objects)
