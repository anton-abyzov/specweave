---
expected_type: module
expected_confidence: high
source: confluence
keywords_density: high
---

# Database Schema Design

## Overview

This document describes the database schema for the application's core entities.

## Entity Relationship Diagram

```
Users 1---* Orders
Users 1---* Sessions
Orders 1---* OrderItems
Products 1---* OrderItems
```

## Tables

### users
**Purpose**: Store user account information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| created_at | TIMESTAMP | NOT NULL | Account creation |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Indexes**:
- `idx_users_email` on `email` (unique)
- `idx_users_created_at` on `created_at`

### sessions
**Purpose**: Track active user sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Session ID |
| user_id | UUID | FK(users.id), NOT NULL | User reference |
| token_hash | VARCHAR(255) | NOT NULL | JWT hash |
| expires_at | TIMESTAMP | NOT NULL | Expiration time |
| created_at | TIMESTAMP | NOT NULL | Session start |

**Indexes**:
- `idx_sessions_user_id` on `user_id`
- `idx_sessions_expires_at` on `expires_at`

### products
**Purpose**: Product catalog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Product ID |
| name | VARCHAR(255) | NOT NULL | Product name |
| description | TEXT | | Product description |
| price | DECIMAL(10,2) | NOT NULL | Price in USD |
| stock | INTEGER | NOT NULL, DEFAULT 0 | Available quantity |
| created_at | TIMESTAMP | NOT NULL | Creation time |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Indexes**:
- `idx_products_name` on `name`
- `idx_products_price` on `price`

### orders
**Purpose**: Customer orders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Order ID |
| user_id | UUID | FK(users.id), NOT NULL | Customer |
| status | VARCHAR(50) | NOT NULL | Order status |
| total | DECIMAL(10,2) | NOT NULL | Total amount |
| created_at | TIMESTAMP | NOT NULL | Order date |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Status Values**: `pending`, `processing`, `shipped`, `delivered`, `cancelled`

**Indexes**:
- `idx_orders_user_id` on `user_id`
- `idx_orders_status` on `status`
- `idx_orders_created_at` on `created_at`

### order_items
**Purpose**: Items within an order

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Item ID |
| order_id | UUID | FK(orders.id), NOT NULL | Order reference |
| product_id | UUID | FK(products.id), NOT NULL | Product reference |
| quantity | INTEGER | NOT NULL, CHECK > 0 | Quantity ordered |
| price | DECIMAL(10,2) | NOT NULL | Price at time of order |

**Indexes**:
- `idx_order_items_order_id` on `order_id`
- `idx_order_items_product_id` on `product_id`

## Migration Strategy

### Phase 1: Create Tables
1. Create `users` table
2. Create `products` table
3. Create `orders` table
4. Create `order_items` table
5. Create `sessions` table

### Phase 2: Add Indexes
Add all indexes defined above for query performance.

### Phase 3: Seed Data
- Load initial product catalog
- Create admin user accounts
- Set up test data for development

## Backup Strategy

- Full backup: Daily at 2 AM UTC
- Incremental backup: Every 6 hours
- Retention: 30 days
- Restore testing: Monthly

## Performance Considerations

- **Connection pooling**: Min 10, Max 100 connections
- **Query timeout**: 30 seconds
- **Index maintenance**: Weekly VACUUM ANALYZE
- **Partitioning**: Consider partitioning `orders` by date if >10M rows

## Component Integration

This schema is accessed by:
- AuthService (`users`, `sessions`)
- ProductService (`products`)
- OrderService (`orders`, `order_items`)
- InventoryService (`products.stock`)
