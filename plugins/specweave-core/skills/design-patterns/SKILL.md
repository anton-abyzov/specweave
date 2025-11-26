---
name: design-patterns
description: Expert knowledge of Gang of Four (GoF) design patterns including creational (Singleton, Factory, Builder, Prototype), structural (Adapter, Decorator, Proxy, Facade), and behavioral (Strategy, Observer, Command, Template Method, Chain of Responsibility). Modern TypeScript/JavaScript implementations with real-world use cases. Activates for design patterns, factory pattern, singleton, strategy pattern, observer pattern, decorator pattern, adapter pattern, builder pattern, proxy pattern, facade pattern, template method.
allowed-tools: Read, Grep, Glob
---

# Design Patterns Expert

Master of GoF design patterns with modern TypeScript implementations.

## Creational Patterns

**Factory Pattern**:
```typescript
interface Animal {
  speak(): string;
}

class Dog implements Animal {
  speak() { return 'Woof!'; }
}

class Cat implements Animal {
  speak() { return 'Meow!'; }
}

class AnimalFactory {
  static create(type: 'dog' | 'cat'): Animal {
    switch (type) {
      case 'dog': return new Dog();
      case 'cat': return new Cat();
    }
  }
}
```

**Singleton Pattern**:
```typescript
class Database {
  private static instance: Database;
  
  private constructor() {} // Private constructor
  
  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}
```

**Builder Pattern**:
```typescript
class UserBuilder {
  private user: Partial<User> = {};
  
  setName(name: string) {
    this.user.name = name;
    return this;
  }
  
  setEmail(email: string) {
    this.user.email = email;
    return this;
  }
  
  build(): User {
    if (!this.user.name || !this.user.email) {
      throw new Error('Missing required fields');
    }
    return this.user as User;
  }
}

// Usage
const user = new UserBuilder()
  .setName('John')
  .setEmail('john@example.com')
  .build();
```

## Structural Patterns

**Adapter Pattern**:
```typescript
// Old API
class OldLogger {
  logMessage(message: string) { console.log(message); }
}

// New interface
interface Logger {
  log(level: string, message: string): void;
}

// Adapter
class LoggerAdapter implements Logger {
  constructor(private oldLogger: OldLogger) {}
  
  log(level: string, message: string) {
    this.oldLogger.logMessage(`[${level}] ${message}`);
  }
}
```

**Decorator Pattern**:
```typescript
interface Coffee {
  cost(): number;
  description(): string;
}

class SimpleCoffee implements Coffee {
  cost() { return 5; }
  description() { return 'Simple coffee'; }
}

class MilkDecorator implements Coffee {
  constructor(private coffee: Coffee) {}
  
  cost() { return this.coffee.cost() + 2; }
  description() { return this.coffee.description() + ', milk'; }
}

// Usage
let coffee: Coffee = new SimpleCoffee();
coffee = new MilkDecorator(coffee);
coffee.cost(); // 7
```

**Proxy Pattern**:
```typescript
class RealImage {
  constructor(private filename: string) {
    this.loadFromDisk();
  }
  
  private loadFromDisk() {
    console.log('Loading:', this.filename);
  }
  
  display() {
    console.log('Displaying:', this.filename);
  }
}

class ProxyImage {
  private realImage?: RealImage;
  
  constructor(private filename: string) {}
  
  display() {
    if (!this.realImage) {
      this.realImage = new RealImage(this.filename); // Lazy loading
    }
    this.realImage.display();
  }
}
```

## Behavioral Patterns

**Strategy Pattern**:
```typescript
interface SortStrategy {
  sort(data: number[]): number[];
}

class QuickSort implements SortStrategy {
  sort(data: number[]) { /* quicksort */ return data; }
}

class MergeSort implements SortStrategy {
  sort(data: number[]) { /* mergesort */ return data; }
}

class Sorter {
  constructor(private strategy: SortStrategy) {}
  
  setStrategy(strategy: SortStrategy) {
    this.strategy = strategy;
  }
  
  sort(data: number[]) {
    return this.strategy.sort(data);
  }
}
```

**Observer Pattern**:
```typescript
interface Observer {
  update(data: any): void;
}

class Subject {
  private observers: Observer[] = [];
  
  attach(observer: Observer) {
    this.observers.push(observer);
  }
  
  notify(data: any) {
    this.observers.forEach(o => o.update(data));
  }
}

class EmailObserver implements Observer {
  update(data: any) {
    console.log('Sending email:', data);
  }
}
```

**Command Pattern**:
```typescript
interface Command {
  execute(): void;
  undo(): void;
}

class SaveCommand implements Command {
  constructor(private editor: Editor) {}
  
  execute() { this.editor.save(); }
  undo() { this.editor.restore(); }
}

class CommandInvoker {
  private history: Command[] = [];
  
  execute(command: Command) {
    command.execute();
    this.history.push(command);
  }
  
  undo() {
    const command = this.history.pop();
    command?.undo();
  }
}
```

Apply design patterns to solve common problems elegantly!
