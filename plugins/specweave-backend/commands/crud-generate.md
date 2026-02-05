---
description: Generate complete CRUD operations for a database entity including model, service, controller, DTOs, and tests
---

# CRUD Generator Command

Generate complete CRUD (Create, Read, Update, Delete) operations for a database entity.

## Task

You are an expert backend developer. Generate a complete CRUD implementation for a specified entity/model with:

### Required Information (Ask if not provided):

1. **Entity Name**: e.g., "User", "Product", "Order"
2. **Fields/Schema**: List of fields with types
3. **Stack**: Node.js/Python/.NET
4. **Framework**: Express/NestJS/FastAPI/Django/ASP.NET Core
5. **Database**: PostgreSQL/MySQL/MongoDB

### Generate:

#### 1. **Model/Entity**
```typescript
// Example for TypeORM
@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 2. **Repository/Data Access**
- Custom query methods
- Filtering, sorting, pagination
- Relationships (if applicable)

#### 3. **Service Layer**
```typescript
export class ProductService {
  async create(dto: CreateProductDto): Promise<Product> { }
  async findAll(query: QueryDto): Promise<PaginatedResponse<Product>> { }
  async findById(id: string): Promise<Product> { }
  async update(id: string, dto: UpdateProductDto): Promise<Product> { }
  async delete(id: string): Promise<void> { }
}
```

#### 4. **DTOs (Data Transfer Objects)**
- CreateDto (input validation)
- UpdateDto (partial update)
- ResponseDto (output serialization)
- QueryDto (filtering/pagination)

#### 5. **Controller/Routes**
```typescript
// REST endpoints
POST   /api/products          - Create
GET    /api/products          - List (with pagination/filtering)
GET    /api/products/:id      - Get by ID
PUT    /api/products/:id      - Update
PATCH  /api/products/:id      - Partial update
DELETE /api/products/:id      - Delete
```

#### 6. **Validation Rules**
- Required fields
- Type validation
- Custom business rules
- Unique constraints

#### 7. **Error Handling**
- Not found errors
- Validation errors
- Duplicate key errors
- Foreign key violations

#### 8. **Tests**
- Unit tests for service
- Integration tests for endpoints
- E2E tests with test database

### Best Practices:

- **Transactions**: Wrap complex operations in DB transactions
- **Soft Delete**: Add deletedAt column instead of hard delete
- **Audit Fields**: createdAt, updatedAt, createdBy, updatedBy
- **Pagination**: Cursor or offset-based
- **Filtering**: Support for common operators (eq, ne, gt, lt, like)
- **Relationships**: Handle related entities properly
- **Security**: Authorization checks, input sanitization

### Example:

```
User: "Generate CRUD for Product entity with name, price, description"
Result: Complete model, service, controller, DTOs, tests for Product
```
