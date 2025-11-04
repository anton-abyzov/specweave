# Coding Standards

**Purpose**: Define coding style, conventions, and best practices for consistent, maintainable code.

**Last Updated**: 2025-11-04
**Owner**: Engineering Team

---

## Language-Specific Standards

### TypeScript/JavaScript

**Style Guide**: [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) (with SpecWeave modifications)

**Linter**: ESLint + Prettier

**Configuration**:
```json
// .eslintrc.json
{
  "extends": ["airbnb-typescript/base", "prettier"],
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

**Naming Conventions**:
| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userId`, `isActive` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Functions | camelCase | `getUserById()`, `calculateTotal()` |
| Classes | PascalCase | `UserService`, `PaymentProcessor` |
| Interfaces | PascalCase (prefix I) | `IUser`, `IPaymentMethod` |
| Types | PascalCase | `UserRole`, `PaymentStatus` |
| Enums | PascalCase | `OrderStatus`, `UserType` |
| Files | kebab-case | `user-service.ts`, `payment-processor.ts` |

**Example**:
```typescript
// ✅ Good
const MAX_LOGIN_ATTEMPTS = 5;
const userId = '123';
const isActive = true;

function calculateTotalPrice(items: CartItem[]): number {
  // Implementation
}

class UserService {
  private readonly userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }
}

// ❌ Bad
const max_login_attempts = 5;  // Wrong: use UPPER_SNAKE_CASE
const UserID = '123';          // Wrong: use camelCase
const Is_Active = true;        // Wrong: use camelCase

function Calculate_Total_Price(Items: any): any {  // Wrong: many issues
  // Implementation
}
```

---

## Code Organization

### File Structure

**TypeScript Project**:
```
src/
├── core/                    # Core business logic (TypeScript utilities)
│   ├── types/               # Type definitions
│   ├── schemas/             # JSON schemas
│   └── utils/               # Utility functions
├── cli/                     # CLI commands
│   └── commands/
├── hooks/                   # Hook helper functions
│   └── lib/
├── adapters/                # Tool adapters (legacy)
├── templates/               # Templates for user projects
└── utils/                   # Shared utilities

tests/
├── unit/                    # Unit tests
├── integration/             # Integration tests
└── e2e/                     # End-to-end tests

plugins/                     # Claude Code plugins
├── specweave/          # Core plugin
│   ├── skills/
│   ├── agents/
│   ├── commands/
│   └── hooks/
└── specweave-github/        # Optional plugins
```

**Module Structure** (example: `user-service/`):
```
user-service/
├── user.service.ts          # Main service class
├── user.repository.ts       # Data access layer
├── user.controller.ts       # API controller (if applicable)
├── user.types.ts            # Type definitions
├── user.schema.ts           # Validation schemas
├── user.test.ts             # Unit tests
└── index.ts                 # Public exports
```

---

## Naming Conventions

### Functions

**Do**:
- ✅ Use verbs: `getUser()`, `createOrder()`, `validateEmail()`
- ✅ Be specific: `getUserById()` not `get()`
- ✅ Boolean functions start with `is`, `has`, `can`: `isValid()`, `hasPermission()`, `canDelete()`

**Don't**:
- ❌ Vague names: `doStuff()`, `handleData()`
- ❌ Abbreviations: `usr()`, `ord()`, `calc()`

**Example**:
```typescript
// ✅ Good
function getUserById(id: string): Promise<User> { }
function isEmailValid(email: string): boolean { }
function hasAdminPermission(user: User): boolean { }

// ❌ Bad
function get(id: string): Promise<any> { }
function check(email: string): boolean { }
function perm(user: any): boolean { }
```

### Variables

**Do**:
- ✅ Descriptive names: `userId`, `totalPrice`, `isActive`
- ✅ Boolean variables: prefix with `is`, `has`, `should`
- ✅ Arrays: plural names: `users`, `orders`, `items`
- ✅ Single objects: singular: `user`, `order`, `item`

**Don't**:
- ❌ Single letters (except loop counters): `u`, `p`, `x`
- ❌ Abbreviations: `usr`, `ord`, `tot`
- ❌ Hungarian notation: `strName`, `intAge`

**Example**:
```typescript
// ✅ Good
const users: User[] = await getUserList();
const activeUsers = users.filter(user => user.isActive);
const totalPrice = calculateTotal(items);

// ❌ Bad
const u: any[] = await getUsr();  // Too short, any type
const lst = u.filter(x => x.act); // Abbreviations
const tot = calc(itm);            // Abbreviations
```

---

## Comments

### When to Comment

**Do Comment**:
- ✅ **Why**, not **what** (code explains what, comments explain why)
- ✅ Complex algorithms (explain approach)
- ✅ Workarounds (why we're doing it this way)
- ✅ TODOs (but use issue tracker for long-term)
- ✅ Public APIs (JSDoc for documentation)

**Don't Comment**:
- ❌ Obvious code (`i++; // increment i`)
- ❌ Commented-out code (delete it, Git remembers)
- ❌ Outdated comments (update or delete)

**Example**:
```typescript
// ✅ Good
// Using exponential backoff to avoid overwhelming the API during rate limit errors
async function retryWithBackoff(fn: () => Promise<void>, maxRetries: number) {
  // Implementation
}

// ❌ Bad
// This function retries
async function retryWithBackoff(fn: () => Promise<void>, maxRetries: number) {
  // Loop through retries
  for (let i = 0; i < maxRetries; i++) {
    // Try the function
    try {
      // Call the function
      await fn();
      // Return if successful
      return;
    } catch (e) {
      // Wait before retrying
      await sleep(2 ** i * 1000);
    }
  }
}
```

### JSDoc for Public APIs

**Format**:
```typescript
/**
 * Retrieves a user by their unique ID.
 *
 * @param id - The user's unique identifier
 * @returns Promise resolving to the user object
 * @throws {UserNotFoundError} If user doesn't exist
 *
 * @example
 * ```typescript
 * const user = await getUserById('123');
 * console.log(user.name);
 * ```
 */
async function getUserById(id: string): Promise<User> {
  // Implementation
}
```

---

## Error Handling

### Use Specific Error Types

**Do**:
```typescript
// ✅ Good - Custom error types
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = 'UserNotFoundError';
  }
}

async function getUserById(id: string): Promise<User> {
  const user = await db.findUser(id);
  if (!user) {
    throw new UserNotFoundError(id);
  }
  return user;
}
```

**Don't**:
```typescript
// ❌ Bad - Generic errors
async function getUserById(id: string): Promise<any> {
  const user = await db.findUser(id);
  if (!user) {
    throw new Error('Error');  // Too generic
  }
  return user;
}
```

### Always Handle Errors

**Do**:
```typescript
// ✅ Good - Handle specific errors
try {
  const user = await getUserById(id);
  return user;
} catch (error) {
  if (error instanceof UserNotFoundError) {
    return null; // Expected case
  }
  throw error; // Unexpected, re-throw
}
```

**Don't**:
```typescript
// ❌ Bad - Silent failures
try {
  const user = await getUserById(id);
  return user;
} catch (error) {
  // Do nothing - user will never know it failed
}
```

---

## Functions

### Function Size

**Guideline**: **< 50 lines** (ideal), **< 100 lines** (max)

**If function > 100 lines**: Extract sub-functions

**Example**:
```typescript
// ❌ Bad - 150 lines, does too much
function processOrder(order: Order): void {
  // Validate order (20 lines)
  // Calculate pricing (30 lines)
  // Apply discounts (25 lines)
  // Process payment (40 lines)
  // Send confirmation email (35 lines)
}

// ✅ Good - Small, focused functions
function processOrder(order: Order): void {
  validateOrder(order);
  const total = calculateTotal(order);
  const discountedTotal = applyDiscounts(order, total);
  processPayment(order, discountedTotal);
  sendConfirmationEmail(order);
}
```

### Pure Functions (Prefer)

**Guideline**: Favor pure functions (no side effects, same input → same output)

**Do**:
```typescript
// ✅ Good - Pure function
function calculateDiscount(price: number, discountPercent: number): number {
  return price * (discountPercent / 100);
}
```

**Don't**:
```typescript
// ❌ Bad - Side effects
let globalDiscount = 0;
function calculateDiscount(price: number, discountPercent: number): number {
  globalDiscount = price * (discountPercent / 100); // Mutates global state
  return globalDiscount;
}
```

---

## TypeScript Best Practices

### Avoid `any`

**Do**:
```typescript
// ✅ Good - Specific types
function getUser(id: string): Promise<User> { }
function processItems<T>(items: T[]): T[] { }
```

**Don't**:
```typescript
// ❌ Bad - any defeats type safety
function getUser(id: any): Promise<any> { }
function processItems(items: any[]): any[] { }
```

### Use Interfaces for Objects

**Do**:
```typescript
// ✅ Good - Interface
interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

function createUser(user: User): void { }
```

**Don't**:
```typescript
// ❌ Bad - Inline types
function createUser(user: { id: string; name: string; email: string; isActive: boolean }): void { }
```

### Use Enums for Fixed Values

**Do**:
```typescript
// ✅ Good - Enum
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest'
}

function hasPermission(role: UserRole): boolean {
  return role === UserRole.Admin;
}
```

**Don't**:
```typescript
// ❌ Bad - Magic strings
function hasPermission(role: string): boolean {
  return role === 'admin';  // Typo risk: 'admn', 'aadmin'
}
```

---

## Testing Standards

### Test File Naming

**Convention**: `{module}.test.ts` (unit), `{module}.integration.test.ts` (integration)

**Example**:
- `user.service.test.ts` - Unit tests
- `user-api.integration.test.ts` - Integration tests

### Test Structure

**Format**: Given-When-Then (BDD style)

**Example**:
```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when user exists', async () => {
      // Given
      const userId = '123';
      const expectedUser = { id: '123', name: 'John' };
      mockDb.findUser.mockResolvedValue(expectedUser);

      // When
      const user = await userService.getUserById(userId);

      // Then
      expect(user).toEqual(expectedUser);
    });

    it('should throw UserNotFoundError when user does not exist', async () => {
      // Given
      const userId = '999';
      mockDb.findUser.mockResolvedValue(null);

      // When / Then
      await expect(userService.getUserById(userId))
        .rejects.toThrow(UserNotFoundError);
    });
  });
});
```

**Test Coverage**:
- ✅ Critical paths: 90%+
- ✅ Overall: 80%+
- ✅ Focus on behavior, not implementation

---

## Performance

### Avoid N+1 Queries

**Do**:
```typescript
// ✅ Good - Batch query
const userIds = orders.map(o => o.userId);
const users = await getUsersByIds(userIds);
```

**Don't**:
```typescript
// ❌ Bad - N+1 query
for (const order of orders) {
  const user = await getUserById(order.userId);  // Query per order!
}
```

### Cache Expensive Operations

**Do**:
```typescript
// ✅ Good - Cache results
const cache = new Map<string, User>();

async function getUserById(id: string): Promise<User> {
  if (cache.has(id)) {
    return cache.get(id)!;
  }
  const user = await db.findUser(id);
  cache.set(id, user);
  return user;
}
```

---

## Security

### Never Hardcode Secrets

**Do**:
```typescript
// ✅ Good - Environment variables
const apiKey = process.env.STRIPE_API_KEY;
```

**Don't**:
```typescript
// ❌ Bad - Hardcoded secret
const apiKey = 'sk_live_abc123xyz';  // NEVER DO THIS!
```

### Validate All Inputs

**Do**:
```typescript
// ✅ Good - Validation
function createUser(email: string): User {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email');
  }
  // Create user
}
```

**Don't**:
```typescript
// ❌ Bad - No validation
function createUser(email: string): User {
  // Assume email is valid - BAD!
}
```

---

## Enforcement

**Tools**:
- **ESLint** - Lint on save (VSCode)
- **Prettier** - Format on save (VSCode)
- **Pre-commit hooks** - Block commits with lint errors
- **CI/CD** - Fail builds on lint errors

**Configuration**:
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Related Documentation

- [Code Review Standards](../delivery/code-review-standards.md) - Review guidelines
- [Testing Strategy](../delivery/guides/testing-strategy.md) - Test coverage goals
- [Security Policy](./security-policy.md) - Security best practices

---

## References

- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Clean Code (Robert Martin)](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
