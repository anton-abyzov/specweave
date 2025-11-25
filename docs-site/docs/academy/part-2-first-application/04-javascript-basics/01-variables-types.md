---
sidebar_position: 1
title: "04.1 Variables & Types"
description: "Storing and working with data in JavaScript"
---

# Lesson 04.1: Variables & Types

**Duration**: 45 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will:
- Declare variables with `let`, `const`, and `var`
- Understand JavaScript data types
- Work with strings, numbers, and booleans
- Know when to use each variable declaration

---

## Variables: Storing Data

Variables are containers for storing data values.

### Declaring Variables

```javascript
// Modern JavaScript (ES6+) - USE THESE
let userName = "Alice";      // Can be reassigned
const maxUsers = 100;        // Cannot be reassigned

// Old JavaScript - AVOID
var oldStyle = "deprecated"; // Function-scoped, hoisted
```

### let vs const

```javascript
// Use 'let' when value will change
let counter = 0;
counter = 1;  // ✅ OK
counter = 2;  // ✅ OK

// Use 'const' when value should NOT change
const API_URL = "https://api.example.com";
API_URL = "https://other.com";  // ❌ Error: Assignment to constant

// Rule of thumb: Start with 'const', switch to 'let' if you need to reassign
```

### Why Avoid var?

```javascript
// 'var' has confusing behavior
if (true) {
  var leaked = "I'm visible outside!";
  let contained = "I stay inside";
}
console.log(leaked);     // "I'm visible outside!" - BAD
console.log(contained);  // Error: not defined - GOOD
```

---

## Data Types

JavaScript has several built-in data types:

### Primitive Types

```javascript
// String - text
const name = "Alice";
const greeting = 'Hello';
const template = `Welcome, ${name}!`;  // Template literal

// Number - integers and decimals
const age = 25;
const price = 19.99;
const negative = -10;

// Boolean - true/false
const isActive = true;
const isAdmin = false;

// Undefined - variable declared but not assigned
let notYetAssigned;
console.log(notYetAssigned);  // undefined

// Null - intentionally empty
const emptyValue = null;

// BigInt - very large integers
const bigNumber = 9007199254740991n;

// Symbol - unique identifier (advanced)
const uniqueId = Symbol("id");
```

### Checking Types

```javascript
console.log(typeof "hello");     // "string"
console.log(typeof 42);          // "number"
console.log(typeof true);        // "boolean"
console.log(typeof undefined);   // "undefined"
console.log(typeof null);        // "object" (historical bug!)
console.log(typeof {});          // "object"
console.log(typeof []);          // "object" (arrays are objects)
```

---

## Working with Strings

### String Operations

```javascript
const firstName = "Alice";
const lastName = "Smith";

// Concatenation
const fullName = firstName + " " + lastName;  // "Alice Smith"

// Template literals (preferred)
const message = `Hello, ${firstName}!`;  // "Hello, Alice!"

// String length
console.log(firstName.length);  // 5

// String methods
console.log(firstName.toUpperCase());  // "ALICE"
console.log(firstName.toLowerCase());  // "alice"
console.log(firstName.charAt(0));      // "A"
console.log(firstName.includes("li")); // true
console.log(firstName.startsWith("A")); // true
console.log(firstName.slice(0, 3));    // "Ali"
```

### Common String Tasks

```javascript
// Trim whitespace
const messy = "  hello  ";
console.log(messy.trim());  // "hello"

// Split into array
const csv = "apple,banana,orange";
const fruits = csv.split(",");  // ["apple", "banana", "orange"]

// Replace
const text = "Hello World";
console.log(text.replace("World", "JavaScript"));  // "Hello JavaScript"
```

---

## Working with Numbers

### Number Operations

```javascript
const a = 10;
const b = 3;

// Arithmetic
console.log(a + b);   // 13 (addition)
console.log(a - b);   // 7 (subtraction)
console.log(a * b);   // 30 (multiplication)
console.log(a / b);   // 3.333... (division)
console.log(a % b);   // 1 (remainder/modulo)
console.log(a ** b);  // 1000 (exponent, 10^3)

// Increment/Decrement
let count = 5;
count++;  // 6
count--;  // 5

// Compound assignment
count += 10;  // count = count + 10 = 15
count *= 2;   // count = count * 2 = 30
```

### Number Methods

```javascript
const price = 19.9876;

// Round
console.log(Math.round(price));   // 20
console.log(Math.floor(price));   // 19 (round down)
console.log(Math.ceil(price));    // 20 (round up)

// Fixed decimal places
console.log(price.toFixed(2));    // "19.99" (string!)

// Parse strings to numbers
console.log(parseInt("42"));      // 42
console.log(parseFloat("3.14"));  // 3.14
console.log(Number("100"));       // 100

// Special values
console.log(Number.MAX_VALUE);    // Largest number
console.log(Infinity);            // Division by zero
console.log(NaN);                 // "Not a Number"
console.log(isNaN("hello" * 2));  // true
```

---

## Working with Booleans

### Boolean Logic

```javascript
const isLoggedIn = true;
const isAdmin = false;

// NOT (!)
console.log(!isLoggedIn);  // false

// AND (&&)
console.log(isLoggedIn && isAdmin);  // false (both must be true)

// OR (||)
console.log(isLoggedIn || isAdmin);  // true (at least one true)
```

### Truthy and Falsy

JavaScript converts values to booleans in conditions:

```javascript
// Falsy values (convert to false)
Boolean(false);      // false
Boolean(0);          // false
Boolean("");         // false
Boolean(null);       // false
Boolean(undefined);  // false
Boolean(NaN);        // false

// Truthy values (convert to true)
Boolean(true);       // true
Boolean(1);          // true
Boolean("hello");    // true
Boolean([]);         // true (empty array!)
Boolean({});         // true (empty object!)
```

### Comparison Operators

```javascript
const x = 5;
const y = "5";

// Equality (loose - converts types)
console.log(x == y);   // true (5 == "5")
console.log(x == 5);   // true

// Strict equality (NO type conversion) - PREFERRED
console.log(x === y);  // false (number !== string)
console.log(x === 5);  // true

// Inequality
console.log(x != y);   // false
console.log(x !== y);  // true (PREFERRED)

// Comparison
console.log(x > 3);    // true
console.log(x < 3);    // false
console.log(x >= 5);   // true
console.log(x <= 5);   // true
```

**Rule**: Always use `===` and `!==` (strict equality).

---

## Type Conversion

### Automatic Conversion (Coercion)

```javascript
// String + Number = String
console.log("5" + 3);     // "53" (concatenation)

// Number operations convert strings
console.log("5" - 3);     // 2 (subtraction)
console.log("5" * 2);     // 10 (multiplication)

// Boolean in math
console.log(true + 1);    // 2 (true = 1)
console.log(false + 1);   // 1 (false = 0)
```

### Explicit Conversion

```javascript
// To String
String(42);         // "42"
(42).toString();    // "42"

// To Number
Number("42");       // 42
parseInt("42");     // 42
+"42";              // 42 (unary plus)

// To Boolean
Boolean(1);         // true
!!1;                // true (double NOT)
```

---

## SpecWeave Connection

In SpecWeave's `spec.md`, you'll define requirements with specific data:

```markdown
### US-001: User Registration
**As a** new user
**I want to** create an account
**So that** I can access the platform

#### Acceptance Criteria
- [ ] **AC-US1-01**: Username must be 3-20 characters (string length)
- [ ] **AC-US1-02**: Age must be 18 or older (number comparison)
- [ ] **AC-US1-03**: Email confirmation must be checked (boolean)
```

These translate to code:

```javascript
const username = "Alice";
const age = 25;
const emailConfirmed = true;

// AC-US1-01: Username 3-20 characters
const validUsername = username.length >= 3 && username.length <= 20;

// AC-US1-02: Age 18+
const validAge = age >= 18;

// AC-US1-03: Email confirmed
const canRegister = validUsername && validAge && emailConfirmed;
```

---

## Practice Exercise

```javascript
// Exercise 1: Variable Declaration
// Declare appropriate variables for a user profile

// Your code here:
// const or let? You decide!
// ____ name = "Your Name";
// ____ age = 25;
// ____ email = "you@example.com";
// ____ isSubscribed = false;

// Exercise 2: String Manipulation
// Given this string, extract the username
const email = "alice@example.com";
// Hint: Use split() to separate at "@"
// const username = ???

// Exercise 3: Type Checking
// What will these return?
// console.log(typeof 42);
// console.log(typeof "42");
// console.log(42 === "42");
// console.log(42 == "42");
```

<details>
<summary>Solutions</summary>

```javascript
// Exercise 1
const name = "Your Name";  // Won't change
let age = 25;              // Might update (birthday!)
const email = "you@example.com";  // Usually fixed
let isSubscribed = false;  // Can change

// Exercise 2
const email = "alice@example.com";
const username = email.split("@")[0];  // "alice"

// Exercise 3
console.log(typeof 42);      // "number"
console.log(typeof "42");    // "string"
console.log(42 === "42");    // false (strict)
console.log(42 == "42");     // true (loose)
```

</details>

---

## Key Takeaways

1. **Use `const` by default**, `let` when reassignment needed
2. **Avoid `var`** — use modern declarations
3. **JavaScript has 7 primitive types** — string, number, boolean, null, undefined, symbol, bigint
4. **Use `===` for comparison** — avoid loose equality
5. **Template literals** (\`${var}\`) are cleaner than concatenation

---

## Next Lesson

Now let's learn about functions — reusable blocks of code.

→ [Continue to Lesson 04.2: Functions](./02-functions)
