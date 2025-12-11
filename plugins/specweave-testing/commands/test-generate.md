# /sw-testing:test-generate

Generate comprehensive unit, integration, and E2E tests from components, functions, and API endpoints.

You are an expert test generation engineer who creates thorough, production-ready test suites.

## Your Task

Analyze code and automatically generate complete test coverage with unit tests, integration tests, and E2E tests.

### 1. Test Generation Strategy

**Unit Tests**:
- Test individual functions/methods in isolation
- Mock all external dependencies
- Cover edge cases and error conditions
- Achieve 100% branch coverage
- Fast execution (<10ms per test)

**Integration Tests**:
- Test component interactions
- Use real dependencies where practical
- Test data flow between modules
- Verify API contracts
- Database integration testing

**E2E Tests**:
- Test complete user workflows
- Verify real browser behavior
- Test authentication flows
- Check responsive design
- Validate accessibility

### 2. Unit Test Generation

**Function Analysis Example**:
```typescript
// Source: src/utils/formatters.ts
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Invalid amount: must be a number');
  }

  if (amount < 0) {
    throw new Error('Invalid amount: must be non-negative');
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}
```

**Generated Unit Test**:
```typescript
// Generated: tests/unit/utils/formatters.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/utils/formatters';

describe('formatCurrency', () => {
  describe('valid inputs', () => {
    it('should format USD currency with default locale', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format EUR currency', () => {
      expect(formatCurrency(1234.56, 'EUR', 'de-DE')).toBe('1.234,56 €');
    });

    it('should format GBP currency', () => {
      expect(formatCurrency(1234.56, 'GBP', 'en-GB')).toBe('£1,234.56');
    });

    it('should handle zero amount', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should handle small amounts', () => {
      expect(formatCurrency(0.01)).toBe('$0.01');
    });

    it('should handle floating point precision', () => {
      expect(formatCurrency(0.1 + 0.2)).toBe('$0.30');
    });
  });

  describe('edge cases', () => {
    it('should throw error for NaN', () => {
      expect(() => formatCurrency(NaN)).toThrow('Invalid amount: must be a number');
    });

    it('should throw error for non-number input', () => {
      expect(() => formatCurrency('123' as any)).toThrow('Invalid amount: must be a number');
    });

    it('should throw error for negative amounts', () => {
      expect(() => formatCurrency(-100)).toThrow('Invalid amount: must be non-negative');
    });

    it('should throw error for undefined', () => {
      expect(() => formatCurrency(undefined as any)).toThrow('Invalid amount: must be a number');
    });

    it('should throw error for null', () => {
      expect(() => formatCurrency(null as any)).toThrow('Invalid amount: must be a number');
    });
  });

  describe('locale variations', () => {
    it('should use French locale', () => {
      expect(formatCurrency(1234.56, 'EUR', 'fr-FR')).toContain('1');
    });

    it('should use Japanese locale', () => {
      expect(formatCurrency(1234, 'JPY', 'ja-JP')).toContain('¥');
    });
  });
});
```

### 3. Component Test Generation

**React Component Analysis**:
```typescript
// Source: src/components/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-${variant} ${fullWidth ? 'w-full' : ''}`}
      data-testid="button"
    >
      {loading && <Spinner />}
      {icon && <span className="icon">{icon}</span>}
      {children}
    </button>
  );
}
```

**Generated Component Test**:
```typescript
// Generated: tests/unit/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/tests/utils/test-utils';
import { Button } from '@/components/Button';

describe('Button', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render primary variant by default', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-primary');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Click me</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-secondary');
    });

    it('should render danger variant', () => {
      render(<Button variant="danger">Delete</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-danger');
    });

    it('should render with icon', () => {
      const icon = <span data-testid="custom-icon">📧</span>;
      render(<Button icon={icon}>Send</Button>);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render full width', () => {
      render(<Button fullWidth>Click me</Button>);
      expect(screen.getByTestId('button')).toHaveClass('w-full');
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByTestId('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Click me</Button>);

      fireEvent.click(screen.getByTestId('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} loading>Click me</Button>);

      fireEvent.click(screen.getByTestId('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Click me</Button>);
      expect(screen.getByTestId('button')).toBeDisabled();
    });

    it('should be disabled when loading', () => {
      render(<Button loading>Click me</Button>);
      expect(screen.getByTestId('button')).toBeDisabled();
    });

    it('should show spinner when loading', () => {
      render(<Button loading>Click me</Button>);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have button role', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByTestId('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});
```

### 4. API Endpoint Test Generation

**API Route Analysis**:
```typescript
// Source: src/api/users.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (page < 1 || limit < 1 || limit > 100) {
    return Response.json(
      { error: 'Invalid pagination parameters' },
      { status: 400 }
    );
  }

  const users = await db.users.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });

  return Response.json({ users, page, limit });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { email, name, role } = body;

  if (!email || !name) {
    return Response.json(
      { error: 'Email and name are required' },
      { status: 400 }
    );
  }

  const existingUser = await db.users.findUnique({ where: { email } });
  if (existingUser) {
    return Response.json(
      { error: 'User already exists' },
      { status: 409 }
    );
  }

  const user = await db.users.create({
    data: { email, name, role: role || 'user' },
  });

  return Response.json({ user }, { status: 201 });
}
```

**Generated API Test**:
```typescript
// Generated: tests/integration/api/users.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from '@/api/users';
import { db } from '@/lib/db';

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    users: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return users with default pagination', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', name: 'User 1' },
        { id: '2', email: 'user2@example.com', name: 'User 2' },
      ];

      vi.mocked(db.users.findMany).mockResolvedValue(mockUsers);

      const request = new Request('http://localhost/api/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual(mockUsers);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(10);
      expect(db.users.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('should handle custom pagination', async () => {
      vi.mocked(db.users.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/users?page=2&limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(data.page).toBe(2);
      expect(data.limit).toBe(20);
      expect(db.users.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 20,
      });
    });

    it('should reject invalid page number', async () => {
      const request = new Request('http://localhost/api/users?page=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid pagination parameters');
    });

    it('should reject limit over 100', async () => {
      const request = new Request('http://localhost/api/users?limit=101');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid pagination parameters');
    });

    it('should handle database errors', async () => {
      vi.mocked(db.users.findMany).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/users');

      await expect(GET(request)).rejects.toThrow('DB error');
    });
  });

  describe('POST /api/users', () => {
    it('should create new user', async () => {
      const newUser = {
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
      };

      vi.mocked(db.users.findUnique).mockResolvedValue(null);
      vi.mocked(db.users.create).mockResolvedValue({
        id: '123',
        ...newUser,
      });

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toMatchObject(newUser);
      expect(db.users.create).toHaveBeenCalledWith({
        data: newUser,
      });
    });

    it('should default role to user', async () => {
      vi.mocked(db.users.findUnique).mockResolvedValue(null);
      vi.mocked(db.users.create).mockResolvedValue({
        id: '123',
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
      });

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', name: 'Test' }),
      });

      await POST(request);

      expect(db.users.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test',
          role: 'user',
        },
      });
    });

    it('should reject missing email', async () => {
      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and name are required');
    });

    it('should reject missing name', async () => {
      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and name are required');
    });

    it('should reject duplicate email', async () => {
      vi.mocked(db.users.findUnique).mockResolvedValue({
        id: '123',
        email: 'existing@example.com',
        name: 'Existing',
        role: 'user',
      });

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          name: 'Test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('User already exists');
    });
  });
});
```

### 5. Custom Hook Test Generation

**Hook Analysis**:
```typescript
// Source: src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Generated Hook Test**:
```typescript
// Generated: tests/unit/hooks/useDebounce.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    vi.advanceTimersByTime(500);

    // Value should update after delay
    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('should cancel previous timeout on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    // Rapid updates
    rerender({ value: 'update1' });
    vi.advanceTimersByTime(200);

    rerender({ value: 'update2' });
    vi.advanceTimersByTime(200);

    rerender({ value: 'final' });
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(result.current).toBe('final');
    });
  });

  it('should handle delay changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 1000 });
    vi.advanceTimersByTime(500);

    // Should not update yet (new delay is 1000ms)
    expect(result.current).toBe('initial');

    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('should handle different value types', async () => {
    // Number
    const { result: numberResult } = renderHook(() => useDebounce(42, 100));
    expect(numberResult.current).toBe(42);

    // Object
    const obj = { name: 'test' };
    const { result: objResult } = renderHook(() => useDebounce(obj, 100));
    expect(objResult.current).toBe(obj);

    // Array
    const arr = [1, 2, 3];
    const { result: arrResult } = renderHook(() => useDebounce(arr, 100));
    expect(arrResult.current).toBe(arr);
  });
});
```

### 6. Store/State Management Test Generation

**Zustand Store Analysis**:
```typescript
// Source: src/stores/useCartStore.ts
import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    });
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    }));
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity } : i
      ),
    }));
  },

  clearCart: () => {
    set({ items: [] });
  },

  total: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
}));
```

**Generated Store Test**:
```typescript
// Generated: tests/unit/stores/useCartStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '@/stores/useCartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useCartStore());
    act(() => {
      result.current.clearCart();
    });
  });

  describe('addItem', () => {
    it('should add new item to cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({
          id: '1',
          name: 'Product A',
          price: 29.99,
        });
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        id: '1',
        name: 'Product A',
        price: 29.99,
        quantity: 1,
      });
    });

    it('should increment quantity for existing item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({
          id: '1',
          name: 'Product A',
          price: 29.99,
        });
        result.current.addItem({
          id: '1',
          name: 'Product A',
          price: 29.99,
        });
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
    });

    it('should add multiple different items', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
        result.current.addItem({ id: '2', name: 'Product B', price: 39.99 });
      });

      expect(result.current.items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
        result.current.removeItem('1');
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should not affect other items', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
        result.current.addItem({ id: '2', name: 'Product B', price: 39.99 });
        result.current.removeItem('1');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('2');
    });

    it('should handle removing non-existent item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
        result.current.removeItem('999');
      });

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
        result.current.updateQuantity('1', 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it('should remove item when quantity is 0', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
        result.current.updateQuantity('1', 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should remove item when quantity is negative', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
        result.current.updateQuantity('1', -1);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should remove all items', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
        result.current.addItem({ id: '2', name: 'Product B', price: 39.99 });
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('total', () => {
    it('should calculate total for single item', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
      });

      expect(result.current.total()).toBe(29.99);
    });

    it('should calculate total for multiple items', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 29.99 });
        result.current.addItem({ id: '2', name: 'Product B', price: 39.99 });
      });

      expect(result.current.total()).toBe(69.98);
    });

    it('should calculate total with quantities', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ id: '1', name: 'Product A', price: 10 });
        result.current.updateQuantity('1', 3);
      });

      expect(result.current.total()).toBe(30);
    });

    it('should return 0 for empty cart', () => {
      const { result } = renderHook(() => useCartStore());
      expect(result.current.total()).toBe(0);
    });
  });
});
```

### 7. Test Generation CLI

**Test Generator Script**:
```typescript
// scripts/generate-tests.ts
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

interface TestConfig {
  sourceFile: string;
  testType: 'unit' | 'integration' | 'e2e';
  outputFile?: string;
}

export async function generateTests(config: TestConfig) {
  const code = fs.readFileSync(config.sourceFile, 'utf-8');
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const tests: string[] = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name;
      if (name) {
        tests.push(generateFunctionTest(name, path.node));
      }
    },
    ExportNamedDeclaration(path) {
      if (path.node.declaration?.type === 'FunctionDeclaration') {
        const name = path.node.declaration.id?.name;
        if (name) {
          tests.push(generateFunctionTest(name, path.node.declaration));
        }
      }
    },
  });

  const outputPath = config.outputFile || generateOutputPath(config.sourceFile);
  const testContent = generateTestFile(tests, config.sourceFile);

  fs.writeFileSync(outputPath, testContent, 'utf-8');
  console.log(`✓ Generated tests: ${outputPath}`);
}

function generateOutputPath(sourceFile: string): string {
  const relativePath = path.relative('src', sourceFile);
  return path.join('tests', 'unit', relativePath.replace(/\.ts$/, '.test.ts'));
}

function generateFunctionTest(name: string, node: any): string {
  return `
  describe('${name}', () => {
    it('should work correctly', () => {
      // TODO: Implement test
      expect(${name}).toBeDefined();
    });
  });
  `;
}

function generateTestFile(tests: string[], sourceFile: string): string {
  const importPath = path.relative(
    path.dirname(generateOutputPath(sourceFile)),
    sourceFile
  ).replace(/\.ts$/, '');

  return `
import { describe, it, expect } from 'vitest';
import { } from '${importPath}';

describe('${path.basename(sourceFile)}', () => {
  ${tests.join('\n')}
});
  `.trim();
}
```

### 8. Test Templates

**Template Registry** (`tests/templates/`):
```typescript
// tests/templates/component.template.ts
export const componentTestTemplate = `
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import { {{ComponentName}} } from '@/components/{{ComponentName}}';

describe('{{ComponentName}}', () => {
  it('should render correctly', () => {
    render(<{{ComponentName}} />);
    expect(screen.getByTestId('{{testId}}')).toBeInTheDocument();
  });

  it('should handle user interactions', () => {
    const handleClick = vi.fn();
    render(<{{ComponentName}} onClick={handleClick} />);

    fireEvent.click(screen.getByTestId('{{testId}}'));
    expect(handleClick).toHaveBeenCalled();
  });
});
`;

// tests/templates/api.template.ts
export const apiTestTemplate = `
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { {{functionName}} } from '@/api/{{fileName}}';

describe('{{functionName}}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success response', async () => {
    const request = new Request('http://localhost/api/{{endpoint}}');
    const response = await {{functionName}}(request);

    expect(response.status).toBe(200);
  });

  it('should handle errors', async () => {
    // TODO: Implement error case
  });
});
`;
```

### 9. Coverage Gaps Detection

**Coverage Analyzer**:
```typescript
// scripts/analyze-coverage-gaps.ts
import fs from 'fs';
import path from 'path';

interface CoverageSummary {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

export function analyzeCoverageGaps(coverageFile: string) {
  const coverage: CoverageSummary = JSON.parse(
    fs.readFileSync(coverageFile, 'utf-8')
  );

  const gaps = [];

  Object.entries(coverage).forEach(([file, data]) => {
    if (file === 'total') return;

    const { lines, functions, branches } = data as any;

    if (lines.pct < 80) {
      gaps.push({
        file,
        type: 'lines',
        current: lines.pct,
        target: 80,
        gap: 80 - lines.pct,
      });
    }

    if (functions.pct < 80) {
      gaps.push({
        file,
        type: 'functions',
        current: functions.pct,
        target: 80,
        gap: 80 - functions.pct,
      });
    }

    if (branches.pct < 80) {
      gaps.push({
        file,
        type: 'branches',
        current: branches.pct,
        target: 80,
        gap: 80 - branches.pct,
      });
    }
  });

  return gaps.sort((a, b) => b.gap - a.gap);
}

// Generate test stubs for gaps
export function generateGapTests(gaps: any[]) {
  gaps.slice(0, 10).forEach((gap) => {
    console.log(`
Priority: ${gap.file}
Coverage: ${gap.current}% ${gap.type}
Gap: ${gap.gap}%

Suggested tests:
- Add ${gap.type} coverage for uncovered paths
- Focus on edge cases and error handling
    `);
  });
}
```

### 10. Package Scripts

```json
{
  "scripts": {
    "test:generate": "tsx scripts/generate-tests.ts",
    "test:generate:component": "tsx scripts/generate-tests.ts --type component",
    "test:generate:api": "tsx scripts/generate-tests.ts --type api",
    "test:coverage:gaps": "tsx scripts/analyze-coverage-gaps.ts coverage/coverage-summary.json",
    "test:stub": "tsx scripts/generate-test-stubs.ts"
  }
}
```

## Workflow

1. Ask about code to generate tests for (file path or pattern)
2. Analyze code structure and identify test targets
3. Determine appropriate test types (unit/integration/E2E)
4. Generate test scaffolding with proper imports
5. Create test cases for happy paths
6. Add edge case and error handling tests
7. Generate mocks and fixtures
8. Add accessibility and performance tests (if applicable)
9. Run tests to verify they work
10. Analyze coverage and suggest improvements

## When to Use

- Adding tests to existing code
- Achieving test coverage targets
- Creating test stubs for new features
- Migrating to new testing framework
- Identifying coverage gaps
- Implementing TDD workflow
- Standardizing test patterns

Generate comprehensive test coverage automatically!
