/**
 * Test Data Factory Template
 *
 * This template demonstrates best practices for creating reusable
 * test data factories using the Factory pattern.
 *
 * Benefits:
 * - Consistent test data generation
 * - Easy to customize with overrides
 * - Reduces test setup boilerplate
 * - Type-safe with TypeScript
 */

import { faker } from '@faker-js/faker';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'guest';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile?: UserProfile;
}

export interface UserProfile {
  bio: string;
  avatar: string;
  phoneNumber: string;
  address: Address;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  quantity: number;
  imageUrl: string;
  createdAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * User Factory
 *
 * Creates realistic user test data with sensible defaults
 */
export class UserFactory {
  /**
   * Create a single user
   *
   * @param overrides - Partial user object to override defaults
   * @returns Complete user object
   *
   * @example
   * ```ts
   * const admin = UserFactory.create({ role: 'admin' });
   * const inactiveUser = UserFactory.create({ isActive: false });
   * ```
   */
  static create(overrides: Partial<User> = {}): User {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email =
      overrides.email || faker.internet.email({ firstName, lastName });

    return {
      id: faker.string.uuid(),
      email,
      username: faker.internet.userName({ firstName, lastName }),
      firstName,
      lastName,
      role: 'user',
      isActive: true,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  /**
   * Create multiple users
   *
   * @param count - Number of users to create
   * @param overrides - Partial user object to override defaults for all users
   * @returns Array of user objects
   *
   * @example
   * ```ts
   * const users = UserFactory.createMany(5);
   * const admins = UserFactory.createMany(3, { role: 'admin' });
   * ```
   */
  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create admin user
   *
   * @param overrides - Partial user object to override defaults
   * @returns Admin user object
   */
  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'admin',
      ...overrides,
    });
  }

  /**
   * Create user with complete profile
   *
   * @param overrides - Partial user object to override defaults
   * @returns User with profile object
   */
  static createWithProfile(overrides: Partial<User> = {}): User {
    return this.create({
      profile: {
        bio: faker.person.bio(),
        avatar: faker.image.avatar(),
        phoneNumber: faker.phone.number(),
        address: AddressFactory.create(),
      },
      ...overrides,
    });
  }

  /**
   * Create inactive user
   *
   * @param overrides - Partial user object to override defaults
   * @returns Inactive user object
   */
  static createInactive(overrides: Partial<User> = {}): User {
    return this.create({
      isActive: false,
      ...overrides,
    });
  }
}

/**
 * Address Factory
 *
 * Creates realistic address test data
 */
export class AddressFactory {
  static create(overrides: Partial<Address> = {}): Address {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country(),
      ...overrides,
    };
  }

  static createUS(overrides: Partial<Address> = {}): Address {
    return this.create({
      country: 'United States',
      zipCode: faker.location.zipCode('#####'),
      state: faker.location.state({ abbreviated: true }),
      ...overrides,
    });
  }
}

/**
 * Product Factory
 *
 * Creates realistic product test data
 */
export class ProductFactory {
  static create(overrides: Partial<Product> = {}): Product {
    return {
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      category: faker.commerce.department(),
      inStock: true,
      quantity: faker.number.int({ min: 0, max: 100 }),
      imageUrl: faker.image.url(),
      createdAt: faker.date.past(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<Product> = {}): Product[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createOutOfStock(overrides: Partial<Product> = {}): Product {
    return this.create({
      inStock: false,
      quantity: 0,
      ...overrides,
    });
  }

  static createExpensive(overrides: Partial<Product> = {}): Product {
    return this.create({
      price: faker.number.int({ min: 1000, max: 10000 }),
      ...overrides,
    });
  }
}

/**
 * Order Factory
 *
 * Creates realistic order test data with items
 */
export class OrderFactory {
  static create(overrides: Partial<Order> = {}): Order {
    const items = overrides.items || [
      {
        productId: faker.string.uuid(),
        quantity: faker.number.int({ min: 1, max: 5 }),
        price: parseFloat(faker.commerce.price()),
      },
    ];

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      items,
      subtotal,
      tax,
      total,
      status: 'pending',
      shippingAddress: AddressFactory.createUS(),
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<Order> = {}): Order[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createWithItems(items: OrderItem[], overrides: Partial<Order> = {}): Order {
    return this.create({ items, ...overrides });
  }

  static createShipped(overrides: Partial<Order> = {}): Order {
    return this.create({
      status: 'shipped',
      ...overrides,
    });
  }

  static createCancelled(overrides: Partial<Order> = {}): Order {
    return this.create({
      status: 'cancelled',
      ...overrides,
    });
  }
}

// ============================================================================
// BUILDER PATTERN (Advanced)
// ============================================================================

/**
 * User Builder
 *
 * Provides a fluent interface for building complex user objects
 *
 * @example
 * ```ts
 * const user = new UserBuilder()
 *   .withEmail('admin@example.com')
 *   .withRole('admin')
 *   .withProfile()
 *   .build();
 * ```
 */
export class UserBuilder {
  private user: Partial<User> = {};

  withId(id: string): this {
    this.user.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  withUsername(username: string): this {
    this.user.username = username;
    return this;
  }

  withName(firstName: string, lastName: string): this {
    this.user.firstName = firstName;
    this.user.lastName = lastName;
    return this;
  }

  withRole(role: User['role']): this {
    this.user.role = role;
    return this;
  }

  withProfile(profile?: UserProfile): this {
    this.user.profile = profile || {
      bio: faker.person.bio(),
      avatar: faker.image.avatar(),
      phoneNumber: faker.phone.number(),
      address: AddressFactory.create(),
    };
    return this;
  }

  inactive(): this {
    this.user.isActive = false;
    return this;
  }

  active(): this {
    this.user.isActive = true;
    return this;
  }

  build(): User {
    return UserFactory.create(this.user);
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Simple user creation
 */
export function exampleSimpleUser() {
  const user = UserFactory.create();
  const admin = UserFactory.createAdmin();
  const users = UserFactory.createMany(5);

  return { user, admin, users };
}

/**
 * Example: Customized user creation
 */
export function exampleCustomUser() {
  const user = UserFactory.create({
    email: 'custom@example.com',
    role: 'admin',
    isActive: false,
  });

  return user;
}

/**
 * Example: Builder pattern
 */
export function exampleBuilder() {
  const user = new UserBuilder()
    .withEmail('builder@example.com')
    .withName('John', 'Doe')
    .withRole('admin')
    .withProfile()
    .active()
    .build();

  return user;
}

/**
 * Example: Order with products
 */
export function exampleOrder() {
  // Create products
  const products = ProductFactory.createMany(3);

  // Create order items from products
  const items: OrderItem[] = products.map((product) => ({
    productId: product.id,
    quantity: faker.number.int({ min: 1, max: 3 }),
    price: product.price,
  }));

  // Create order with items
  const order = OrderFactory.createWithItems(items);

  return { products, order };
}

// ============================================================================
// TEST USAGE
// ============================================================================

/**
 * Example test using factories
 */
import { describe, it, expect } from 'vitest';

describe('UserService (using factories)', () => {
  it('should create user', () => {
    // ARRANGE
    const userData = UserFactory.create();

    // ACT
    const result = userService.create(userData);

    // ASSERT
    expect(result.id).toBeDefined();
    expect(result.email).toBe(userData.email);
  });

  it('should only allow admins to delete users', () => {
    // ARRANGE
    const admin = UserFactory.createAdmin();
    const regularUser = UserFactory.create();

    // ACT & ASSERT
    expect(() => userService.deleteUser(regularUser.id, admin)).not.toThrow();
    expect(() => userService.deleteUser(admin.id, regularUser)).toThrow('Unauthorized');
  });

  it('should calculate order total correctly', () => {
    // ARRANGE
    const order = OrderFactory.create({
      items: [
        { productId: '1', quantity: 2, price: 50 },
        { productId: '2', quantity: 1, price: 30 },
      ],
    });

    // ACT
    const total = orderService.calculateTotal(order);

    // ASSERT
    expect(total).toBe(140.4); // (50*2 + 30*1) * 1.08 tax
  });
});

// ============================================================================
// BEST PRACTICES
// ============================================================================

/*
✅ Use realistic data (faker.js)
✅ Provide sensible defaults
✅ Allow overrides for customization
✅ Type-safe with TypeScript
✅ Create helper methods (createAdmin, createInactive, etc.)
✅ Builder pattern for complex objects
✅ Consistent naming (create, createMany, createWith...)
✅ Document with JSDoc
✅ Export all factories for reuse
✅ Keep factories simple and focused
*/
