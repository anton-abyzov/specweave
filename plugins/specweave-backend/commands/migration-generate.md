---
description: Generate database migration files for schema changes with up/down migrations and safety checks
---

# Database Migration Generator

Generate database migration files for schema changes.

## Task

You are an expert database migration specialist. Generate migration files based on the user's requirements.

### Required Information (Ask if not provided):

1. **Migration Type**:
   - Create table
   - Add column(s)
   - Modify column(s)
   - Drop column(s)
   - Add index
   - Add foreign key
   - Seed data

2. **ORM/Tool**:
   - TypeORM (Node.js)
   - Sequelize (Node.js)
   - Alembic (Python)
   - Entity Framework (. NET)
   - Flyway (Java)
   - Raw SQL

3. **Database**: PostgreSQL, MySQL, MongoDB, SQL Server

### Generate Migration:

#### 1. **Up Migration** (Apply Changes)
```typescript
// TypeORM example
export class CreateProductsTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );
  }
}
```

#### 2. **Down Migration** (Rollback)
```typescript
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('products');
  }
```

#### 3. **Migration Naming**:
- Timestamp-based: `1234567890_create_products_table.ts`
- Descriptive: Clearly state what the migration does

#### 4. **Safety Checks**:
- Check if table/column exists before creating
- Use transactions for complex migrations
- Add indexes concurrently (PostgreSQL)
- Avoid locking production tables

#### 5. **Data Migrations**:
```typescript
// Example: Backfill existing data
await queryRunner.query(`
  UPDATE users
  SET status = 'active'
  WHERE status IS NULL
`);
```

### Best Practices:

- **Idempotency**: Migrations should be safe to run multiple times
- **Atomicity**: Wrap in transactions where possible
- **Reversibility**: Always provide down migration
- **Testing**: Test both up and down on staging database
- **Documentation**: Add comments explaining complex logic
- **Performance**: Consider impact on large tables
- **Indexes**: Add indexes for foreign keys

### Common Patterns:

1. **Add Column with Default**:
```sql
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
```

2. **Rename Column** (safe):
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
-- Step 2: Copy data
UPDATE users SET full_name = name;
-- Step 3: Drop old column (after deployment)
ALTER TABLE users DROP COLUMN name;
```

3. **Change Column Type**:
```sql
ALTER TABLE products
ALTER COLUMN price TYPE NUMERIC(12,2) USING price::numeric(12,2);
```

### Example:

```
User: "Create migration to add email_verified column to users table"
Result: Complete TypeORM migration with up/down, safe defaults
```
