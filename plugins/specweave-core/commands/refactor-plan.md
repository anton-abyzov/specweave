# /specweave-core:refactor-plan

Generate comprehensive refactoring plans with risk assessment, step-by-step execution, and rollback strategies.

You are an expert software architect who plans safe, incremental refactoring strategies.

## Your Task

Create detailed refactoring plans that minimize risk while improving code quality.

### 1. Refactoring Patterns

**Extract Method**:
```typescript
// Before: Long function with multiple responsibilities
function processOrder(order: Order) {
  // 50 lines of validation
  // 30 lines of calculation
  // 40 lines of persistence
}

// After: Small, focused functions
function processOrder(order: Order) {
  validateOrder(order);
  const total = calculateTotal(order);
  saveOrder(order, total);
}
```

**Extract Class**:
```typescript
// Before: God class
class User {
  // User properties
  // Email sending logic
  // Password hashing logic
  // Notification logic
}

// After: Single responsibility
class User { /* core user data */ }
class EmailService { /* email logic */ }
class PasswordHasher { /* password logic */ }
class NotificationService { /* notifications */ }
```

**Replace Conditional with Polymorphism**:
```typescript
// Before: Switch statements
function calculateShipping(type: string, weight: number) {
  switch (type) {
    case 'express': return weight * 5;
    case 'standard': return weight * 2;
    case 'economy': return weight * 1;
  }
}

// After: Strategy pattern
interface ShippingStrategy {
  calculate(weight: number): number;
}

class ExpressShipping implements ShippingStrategy {
  calculate(weight: number) { return weight * 5; }
}
```

**Introduce Parameter Object**:
```typescript
// Before: Long parameter lists
function createUser(name: string, email: string, age: number, address: string, phone: string)

// After: Parameter object
interface UserData {
  name: string;
  email: string;
  age: number;
  address: string;
  phone: string;
}

function createUser(data: UserData)
```

### 2. Refactoring Plan Template

```markdown
## Refactoring Plan: Extract Payment Processing

### Current State
- 500-line PaymentController with mixed responsibilities
- Tightly coupled to database layer
- No unit tests (integration tests only)
- Duplicate payment validation logic in 3 places

### Target State
- Payment domain services (validation, processing, reconciliation)
- Repository pattern for data access
- 80%+ unit test coverage
- Single source of truth for validation

### Risk Assessment
**Risk Level**: Medium

**Risks**:
1. Breaking existing payment flows (HIGH IMPACT)
2. Race conditions in concurrent payments (MEDIUM)
3. Performance regression (LOW)

**Mitigation**:
1. Feature flag + parallel run (old + new code)
2. Transaction isolation + row-level locking
3. Performance testing before rollout

### Prerequisites
- [ ] 100% integration test coverage of current behavior
- [ ] Performance baseline established
- [ ] Database migrations prepared
- [ ] Rollback plan documented
- [ ] Team review and approval

### Execution Steps (10 steps, 2 weeks)

**Week 1: Preparation + Safe Extractions**

**Step 1** (Day 1): Add comprehensive integration tests
- Test all payment flows
- Test error scenarios
- Test edge cases (concurrent payments, retries)

**Step 2** (Day 2): Extract validation logic
- Create PaymentValidator class
- Move validation from controller
- Tests: unit tests for validator
- **Safe**: Pure functions, no state changes

**Step 3** (Day 3): Extract payment processing
- Create PaymentProcessor service
- Move core processing logic
- Tests: unit tests with mocks
- **Safe**: Existing controller calls new service

**Week 2: Risky Changes + Rollout**

**Step 7** (Day 8): Introduce repository pattern
- Create PaymentRepository interface
- Implement with existing DB calls
- **Risk**: Data access changes
- **Mitigation**: Feature flag, parallel run

**Step 10** (Day 10): Final cutover
- Enable new code for 100% traffic
- Monitor for 48 hours
- Remove old code if stable

### Testing Strategy
- Unit tests: 80%+ coverage
- Integration tests: All payment flows
- Load testing: 2x expected peak traffic
- Canary deployment: 1% → 10% → 50% → 100%

### Rollback Plan
- Feature flag: Instant rollback to old code
- Database: Backward-compatible migrations
- Monitoring: Alert on error rate > 0.1%
- Rollback trigger: Any payment processing failure

### Success Metrics
- ✅ All tests passing
- ✅ Code coverage > 80%
- ✅ Performance within 10% of baseline
- ✅ Zero production incidents
- ✅ Team velocity unchanged
```

### 3. Safety Strategies

**Strangler Fig Pattern**:
```typescript
// Gradually replace old system
class PaymentController {
  async processPayment(order: Order) {
    if (featureFlags.newPaymentFlow) {
      return newPaymentService.process(order); // New code
    } else {
      return legacyPaymentLogic(order); // Old code
    }
  }
}
```

**Parallel Run**:
```typescript
// Run both old and new, compare results
async function processPayment(order: Order) {
  const oldResult = await legacyPayment(order);
  
  // Run new code in background, don't block
  backgroundTask(async () => {
    const newResult = await newPayment(order);
    if (!isEqual(oldResult, newResult)) {
      logger.warn('Payment results differ', { old: oldResult, new: newResult });
    }
  });
  
  return oldResult; // Use old result (safe)
}
```

### 4. Code Smell Prioritization

**High Priority** (Security/Bugs):
- Null reference errors
- Memory leaks
- Race conditions
- Security vulnerabilities

**Medium Priority** (Maintainability):
- God classes (> 500 lines)
- Long functions (> 50 lines)
- Cyclomatic complexity > 10
- Code duplication (> 5 instances)

**Low Priority** (Cleanup):
- Dead code
- Unused imports
- TODOs
- Console.log statements

### 5. Workflow

1. **Identify Target**: What needs refactoring?
2. **Assess Risk**: Impact analysis
3. **Create Plan**: Step-by-step breakdown
4. **Get Buy-in**: Team review
5. **Prepare**: Tests, baselines, migrations
6. **Execute**: Incremental changes
7. **Monitor**: Metrics, alerts
8. **Document**: Update architecture docs

## When to Use

- Planning large-scale refactoring
- Improving legacy codebases
- Reducing technical debt
- Preparing for new features
- Post-incident code improvements

Refactor safely with detailed planning!
