---
name: code-quality
description: Expert code quality engineering covering clean code principles, SOLID, DRY, KISS, YAGNI, code smells, refactoring patterns, static analysis, linting, code coverage, mutation testing, and software craftsmanship. Activates for code quality, clean code, SOLID principles, code smells, refactoring, technical debt, code review, linting, eslint, prettier, static analysis, code coverage.
---

# Code Quality Expert

Master of clean code principles, SOLID, and software craftsmanship.

## SOLID Principles

**Single Responsibility**:
```typescript
// ❌ Bad: Multiple responsibilities
class User {
  save() { /* database logic */ }
  sendEmail() { /* email logic */ }
  hashPassword() { /* crypto logic */ }
}

// ✅ Good: Single responsibility
class User { /* user data only */ }
class UserRepository { save(user: User) {} }
class EmailService { send(to: string, message: string) {} }
class PasswordHasher { hash(password: string) {} }
```

**Open/Closed**:
```typescript
// ✅ Open for extension, closed for modification
interface PaymentMethod {
  processPayment(amount: number): Promise<void>;
}

class CreditCardPayment implements PaymentMethod {
  async processPayment(amount: number) { /* ... */ }
}

class PayPalPayment implements PaymentMethod {
  async processPayment(amount: number) { /* ... */ }
}

// Add new payment methods without modifying existing code
```

**Liskov Substitution**:
```typescript
// Subtypes must be substitutable for base types
class Bird {
  fly() { /* ... */ }
}

// ❌ Bad: Penguin can't fly, violates LSP
class Penguin extends Bird {
  fly() { throw new Error('Cannot fly'); }
}

// ✅ Good: Proper abstraction
interface Bird {}
interface FlyingBird extends Bird { fly(): void; }
class Sparrow implements FlyingBird { fly() {} }
class Penguin implements Bird {} // No fly method
```

**Interface Segregation**:
```typescript
// ❌ Bad: Fat interface
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
}

// ✅ Good: Segregated interfaces
interface Workable { work(): void; }
interface Eatable { eat(): void; }
interface Sleepable { sleep(): void; }

class Human implements Workable, Eatable, Sleepable {}
class Robot implements Workable {} // Doesn't need eat/sleep
```

**Dependency Inversion**:
```typescript
// ❌ Bad: High-level depends on low-level
class EmailService {
  private smtp = new SMTPClient(); // Direct dependency
}

// ✅ Good: Depend on abstraction
interface EmailClient {
  send(to: string, message: string): Promise<void>;
}

class EmailService {
  constructor(private client: EmailClient) {}
}
```

## Clean Code Principles

**DRY (Don't Repeat Yourself)**:
```typescript
// ❌ Duplication
function validateEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}
function validateUserEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email); // Duplicate
}

// ✅ Single source of truth
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const isValidEmail = (email: string) => EMAIL_REGEX.test(email);
```

**KISS (Keep It Simple)**:
```typescript
// ❌ Over-engineered
class AdvancedCalculatorFactoryBuilderSingleton {
  private static instance: AdvancedCalculatorFactoryBuilderSingleton;
  // 50 lines of unnecessary abstraction
}

// ✅ Simple
const add = (a: number, b: number) => a + b;
```

**YAGNI (You Aren't Gonna Need It)**:
```typescript
// ❌ Premature abstraction
class User {
  futureFeature1() {} // Not used yet
  futureFeature2() {} // Not used yet
  futureFeature3() {} // Not used yet
}

// ✅ Only what's needed now
class User {
  getCurrentFeatures() {} // Actually used
}
```

## Code Smells

**Long Method**: > 50 lines → Extract methods
**Large Class**: > 300 lines → Extract classes
**Long Parameter List**: > 3 params → Parameter object
**Primitive Obsession**: Use value objects
**Data Clumps**: Group related data
**Switch Statements**: Replace with polymorphism

## Testing Strategies

**Test Coverage**: 80%+ for critical paths
**Mutation Testing**: Ensure test quality
**Test Pyramid**: Many unit, few integration, minimal E2E
