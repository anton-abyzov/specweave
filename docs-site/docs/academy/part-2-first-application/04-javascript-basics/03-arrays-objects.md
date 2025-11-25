---
sidebar_position: 3
title: "04.3 Arrays & Objects"
description: "Organizing data with JavaScript data structures"
---

# Lesson 04.3: Arrays & Objects

**Duration**: 60 minutes | **Difficulty**: Beginner

---

## Learning Objectives

By the end of this lesson, you will:
- Create and manipulate arrays
- Create and work with objects
- Use destructuring for cleaner code
- Combine arrays and objects effectively

---

## Arrays: Ordered Lists

Arrays store ordered collections of items.

### Creating Arrays

```javascript
// Array literal (preferred)
const fruits = ["apple", "banana", "orange"];

// Array constructor (rarely used)
const numbers = new Array(1, 2, 3);

// Empty array
const empty = [];

// Mixed types (possible, but usually avoid)
const mixed = [1, "two", true, null];
```

### Accessing Elements

```javascript
const colors = ["red", "green", "blue"];

// By index (0-based)
console.log(colors[0]);  // "red"
console.log(colors[1]);  // "green"
console.log(colors[2]);  // "blue"
console.log(colors[3]);  // undefined (out of bounds)

// Last element
console.log(colors[colors.length - 1]);  // "blue"

// Modern: at() method
console.log(colors.at(-1));  // "blue" (negative index from end)
```

### Modifying Arrays

```javascript
const tasks = ["code", "test", "deploy"];

// Add to end
tasks.push("document");  // ["code", "test", "deploy", "document"]

// Add to beginning
tasks.unshift("plan");   // ["plan", "code", "test", "deploy", "document"]

// Remove from end
const last = tasks.pop();  // "document" (removed)

// Remove from beginning
const first = tasks.shift();  // "plan" (removed)

// Modify by index
tasks[1] = "review";  // ["code", "review", "deploy"]

// Remove/insert at position
tasks.splice(1, 1);              // Remove 1 item at index 1
tasks.splice(1, 0, "test");      // Insert "test" at index 1
tasks.splice(1, 1, "qa", "uat"); // Replace 1 item with 2 items
```

### Array Methods (Non-mutating)

```javascript
const numbers = [1, 2, 3, 4, 5];

// slice: Extract portion (doesn't modify original)
const middle = numbers.slice(1, 4);  // [2, 3, 4]

// concat: Combine arrays
const more = numbers.concat([6, 7, 8]);  // [1, 2, 3, 4, 5, 6, 7, 8]

// join: Convert to string
const str = numbers.join(", ");  // "1, 2, 3, 4, 5"

// includes: Check if contains
const hasThree = numbers.includes(3);  // true

// indexOf: Find position
const position = numbers.indexOf(3);  // 2
```

### Iterating Arrays

```javascript
const items = ["a", "b", "c"];

// for loop
for (let i = 0; i < items.length; i++) {
  console.log(items[i]);
}

// for...of (preferred for values)
for (const item of items) {
  console.log(item);
}

// forEach
items.forEach((item, index) => {
  console.log(`${index}: ${item}`);
});

// map (transform each item)
const upper = items.map(item => item.toUpperCase());
// ["A", "B", "C"]
```

---

## Objects: Key-Value Pairs

Objects store data as key-value pairs.

### Creating Objects

```javascript
// Object literal (preferred)
const user = {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
};

// Object constructor (rarely used)
const obj = new Object();
obj.key = "value";
```

### Accessing Properties

```javascript
const user = {
  name: "Alice",
  age: 30,
  "full-name": "Alice Smith"  // Quoted key for special characters
};

// Dot notation (preferred)
console.log(user.name);  // "Alice"

// Bracket notation (for dynamic keys or special characters)
console.log(user["name"]);      // "Alice"
console.log(user["full-name"]); // "Alice Smith"

// Dynamic key
const key = "age";
console.log(user[key]);  // 30
```

### Modifying Objects

```javascript
const person = {
  name: "Alice"
};

// Add property
person.age = 30;
person["email"] = "alice@example.com";

// Update property
person.name = "Alice Smith";

// Delete property
delete person.email;

// Check if property exists
console.log("name" in person);           // true
console.log(person.hasOwnProperty("age")); // true
```

### Object Methods

```javascript
const user = {
  name: "Alice",
  age: 30,
  greet: function() {
    return `Hello, I'm ${this.name}`;
  },
  // Shorthand method syntax
  introduce() {
    return `I'm ${this.age} years old`;
  }
};

console.log(user.greet());      // "Hello, I'm Alice"
console.log(user.introduce());  // "I'm 30 years old"
```

### Object Utilities

```javascript
const config = {
  host: "localhost",
  port: 3000,
  debug: true
};

// Get all keys
Object.keys(config);    // ["host", "port", "debug"]

// Get all values
Object.values(config);  // ["localhost", 3000, true]

// Get key-value pairs
Object.entries(config); // [["host", "localhost"], ["port", 3000], ["debug", true]]

// Iterate over entries
for (const [key, value] of Object.entries(config)) {
  console.log(`${key}: ${value}`);
}
```

---

## Destructuring

Extract values from arrays/objects into variables.

### Array Destructuring

```javascript
const rgb = [255, 128, 64];

// Without destructuring
const red = rgb[0];
const green = rgb[1];
const blue = rgb[2];

// With destructuring
const [r, g, b] = rgb;
console.log(r, g, b);  // 255 128 64

// Skip elements
const [first, , third] = rgb;
console.log(first, third);  // 255 64

// Rest pattern
const [head, ...tail] = [1, 2, 3, 4, 5];
console.log(head);  // 1
console.log(tail);  // [2, 3, 4, 5]

// Default values
const [a, b, c = 0] = [1, 2];
console.log(c);  // 0
```

### Object Destructuring

```javascript
const user = {
  name: "Alice",
  email: "alice@example.com",
  age: 30
};

// Without destructuring
const name = user.name;
const email = user.email;

// With destructuring
const { name, email } = user;
console.log(name, email);  // "Alice" "alice@example.com"

// Rename variables
const { name: userName, email: userEmail } = user;
console.log(userName, userEmail);

// Default values
const { name, role = "user" } = user;
console.log(role);  // "user"

// Nested destructuring
const response = {
  data: {
    user: {
      id: 1,
      name: "Alice"
    }
  }
};

const { data: { user: { id, name } } } = response;
console.log(id, name);  // 1 "Alice"
```

---

## Spread Operator

Expand arrays/objects.

### Array Spread

```javascript
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];

// Combine arrays
const combined = [...arr1, ...arr2];  // [1, 2, 3, 4, 5, 6]

// Copy array
const copy = [...arr1];

// Add elements while spreading
const extended = [0, ...arr1, 4];  // [0, 1, 2, 3, 4]

// Function arguments
const numbers = [1, 2, 3];
console.log(Math.max(...numbers));  // 3
```

### Object Spread

```javascript
const defaults = {
  theme: "light",
  language: "en"
};

const userPrefs = {
  theme: "dark"
};

// Merge objects (later properties override)
const settings = { ...defaults, ...userPrefs };
// { theme: "dark", language: "en" }

// Copy with additions
const extended = { ...settings, fontSize: 14 };
```

---

## Common Patterns

### Filtering Objects

```javascript
const users = [
  { name: "Alice", role: "admin", active: true },
  { name: "Bob", role: "user", active: false },
  { name: "Charlie", role: "user", active: true }
];

// Find active users
const activeUsers = users.filter(user => user.active);

// Find admins
const admins = users.filter(user => user.role === "admin");

// Find by name
const alice = users.find(user => user.name === "Alice");
```

### Transforming Data

```javascript
const products = [
  { name: "Laptop", price: 999 },
  { name: "Phone", price: 699 },
  { name: "Tablet", price: 499 }
];

// Get just names
const names = products.map(p => p.name);
// ["Laptop", "Phone", "Tablet"]

// Calculate total
const total = products.reduce((sum, p) => sum + p.price, 0);
// 2197

// Transform structure
const priceList = products.map(p => ({
  item: p.name,
  cost: `$${p.price}`
}));
// [{ item: "Laptop", cost: "$999" }, ...]
```

### Grouping Data

```javascript
const tasks = [
  { id: 1, status: "done" },
  { id: 2, status: "pending" },
  { id: 3, status: "done" },
  { id: 4, status: "pending" }
];

// Group by status
const grouped = tasks.reduce((acc, task) => {
  const key = task.status;
  if (!acc[key]) acc[key] = [];
  acc[key].push(task);
  return acc;
}, {});

// {
//   done: [{ id: 1, ... }, { id: 3, ... }],
//   pending: [{ id: 2, ... }, { id: 4, ... }]
// }
```

---

## SpecWeave Connection

SpecWeave's data structures map directly to JavaScript:

### spec.md User Stories as Objects

```javascript
// User story from spec.md
const userStory = {
  id: "US-001",
  title: "User Login",
  asA: "registered user",
  iWant: "log in with my credentials",
  soThat: "I can access my account",
  acceptanceCriteria: [
    { id: "AC-US1-01", description: "User can enter email and password", complete: false },
    { id: "AC-US1-02", description: "Invalid credentials show error", complete: false },
    { id: "AC-US1-03", description: "Successful login redirects", complete: false }
  ]
};

// Check progress
const completedACs = userStory.acceptanceCriteria.filter(ac => ac.complete);
const progress = (completedACs.length / userStory.acceptanceCriteria.length) * 100;
```

### tasks.md Tasks as Array

```javascript
// Tasks from tasks.md
const tasks = [
  { id: "T-001", userStory: "US-001", status: "completed", satisfies: ["AC-US1-01"] },
  { id: "T-002", userStory: "US-001", status: "in_progress", satisfies: ["AC-US1-02"] },
  { id: "T-003", userStory: "US-001", status: "pending", satisfies: ["AC-US1-03"] }
];

// Filter by status
const pendingTasks = tasks.filter(t => t.status === "pending");
const completedTasks = tasks.filter(t => t.status === "completed");

// Find tasks for a user story
const storyTasks = tasks.filter(t => t.userStory === "US-001");

// Get all ACs covered
const coveredACs = tasks.flatMap(t => t.satisfies);
// ["AC-US1-01", "AC-US1-02", "AC-US1-03"]
```

---

## Practice Exercise

```javascript
// Exercise 1: Array Operations
// Given this array, find all even numbers and double them
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Expected: [4, 8, 12, 16, 20]

// Exercise 2: Object Manipulation
// Merge these objects, with user preferences taking priority
const defaults = { theme: "light", fontSize: 14, language: "en" };
const userPrefs = { theme: "dark", fontSize: 16 };
// Expected: { theme: "dark", fontSize: 16, language: "en" }

// Exercise 3: Destructuring
// Extract name and first hobby from this object
const person = {
  name: "Alice",
  hobbies: ["reading", "coding", "gaming"]
};

// Exercise 4: Data Transformation
// Convert this array of users to an object keyed by id
const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" }
];
// Expected: { 1: { id: 1, name: "Alice" }, 2: {...}, 3: {...} }
```

<details>
<summary>Solutions</summary>

```javascript
// Exercise 1
const doubled = numbers.filter(n => n % 2 === 0).map(n => n * 2);
// [4, 8, 12, 16, 20]

// Exercise 2
const merged = { ...defaults, ...userPrefs };
// { theme: "dark", fontSize: 16, language: "en" }

// Exercise 3
const { name, hobbies: [firstHobby] } = person;
// name = "Alice", firstHobby = "reading"

// Exercise 4
const usersById = users.reduce((acc, user) => {
  acc[user.id] = user;
  return acc;
}, {});
// { 1: { id: 1, name: "Alice" }, 2: {...}, 3: {...} }
```

</details>

---

## Key Takeaways

1. **Arrays are ordered lists** — use for sequences of items
2. **Objects are key-value pairs** — use for named properties
3. **Destructuring simplifies extraction** — cleaner code
4. **Spread operator enables immutable updates** — don't mutate, create new
5. **map/filter/reduce are powerful** — learn them well!

---

## Module 04 Complete!

Congratulations! You've learned JavaScript basics:
- ✅ Variables and data types
- ✅ Functions and arrow functions
- ✅ Arrays and objects

---

## Next Module

Ready to build your first project?

→ [Continue to Module 05: Your First Project](../05-first-project/)
