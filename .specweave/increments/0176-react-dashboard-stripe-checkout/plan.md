---
increment: 0176-react-dashboard-stripe-checkout
status: planned
---

# Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React 18 + TypeScript + Tailwind CSS + Recharts                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │  Services   │              │
│  │ - Dashboard │  │ - Charts    │  │ - API Client│              │
│  │ - Auth      │  │ - Layout    │  │ - Stripe.js │              │
│  │ - Checkout  │  │ - Forms     │  │ - Auth      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  .NET 8 Web API + Entity Framework Core                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Controllers │  │  Services   │  │Repositories │              │
│  │ - Auth      │  │ - Auth      │  │ - User      │              │
│  │ - Dashboard │  │ - Payment   │  │ - Order     │              │
│  │ - Payment   │  │ - Analytics │  │ - Subscript │              │
│  │ - Webhook   │  │ - Webhook   │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │PostgreSQL│   │  Stripe  │   │  Email   │
        │ Database │   │   API    │   │ Service  │
        └──────────┘   └──────────┘   └──────────┘
```

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| Recharts | 2.x | Charts/graphs |
| React Router | 6.x | Routing |
| TanStack Query | 5.x | Data fetching |
| Zustand | 4.x | State management |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Validation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| .NET | 8.0 | Runtime |
| ASP.NET Core | 8.0 | Web framework |
| Entity Framework Core | 8.0 | ORM |
| PostgreSQL | 16.x | Database |
| Stripe.net | latest | Payment SDK |
| FluentValidation | 11.x | Validation |
| Serilog | 3.x | Logging |
| MediatR | 12.x | CQRS (optional) |

## Data Model

```
┌──────────────────┐       ┌──────────────────┐
│      User        │       │      Order       │
├──────────────────┤       ├──────────────────┤
│ Id: Guid         │───┐   │ Id: Guid         │
│ Email: string    │   │   │ UserId: Guid     │──┐
│ PasswordHash     │   │   │ Status: enum     │  │
│ FirstName        │   │   │ TotalAmount      │  │
│ LastName         │   │   │ StripeSessionId  │  │
│ CreatedAt        │   │   │ CreatedAt        │  │
│ StripeCustomerId │   │   └──────────────────┘  │
└──────────────────┘   │                         │
         │             │   ┌──────────────────┐  │
         │             └───│   Subscription   │  │
         │                 ├──────────────────┤  │
         │                 │ Id: Guid         │  │
         └─────────────────│ UserId: Guid     │──┘
                           │ PlanId: string   │
                           │ StripeSubId      │
                           │ Status: enum     │
                           │ CurrentPeriodEnd │
                           └──────────────────┘
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/forgot-password | Password reset request |
| POST | /api/auth/reset-password | Reset password |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | KPI statistics |
| GET | /api/dashboard/revenue | Revenue chart data |
| GET | /api/dashboard/sales | Sales by category |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/checkout | Create checkout session |
| GET | /api/payments/orders | User's orders |
| GET | /api/payments/orders/{id} | Order details |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/subscriptions/plans | Available plans |
| POST | /api/subscriptions | Create subscription |
| GET | /api/subscriptions/current | Current subscription |
| DELETE | /api/subscriptions/{id} | Cancel subscription |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/webhooks/stripe | Stripe webhook handler |

## Security

### Authentication Flow
1. User submits credentials
2. Backend validates and returns JWT + refresh token
3. Frontend stores tokens securely
4. JWT sent in Authorization header
5. Refresh token used to renew JWT

### JWT Configuration
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry
- Algorithm: HS256
- Claims: userId, email, role

### Stripe Security
- Webhook signature verification
- Environment-based API keys
- PCI compliance via Stripe.js

## Folder Structure

```
react-dash-stripe/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Base UI components
│   │   │   ├── charts/          # Recharts wrappers
│   │   │   ├── layout/          # Layout components
│   │   │   └── forms/           # Form components
│   │   ├── pages/
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── dashboard/       # Dashboard views
│   │   │   └── checkout/        # Payment pages
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API clients
│   │   ├── stores/              # Zustand stores
│   │   ├── types/               # TypeScript types
│   │   ├── utils/               # Utilities
│   │   └── App.tsx
│   ├── tests/                   # Vitest tests
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/
│   ├── src/
│   │   └── DashboardApi/
│   │       ├── Controllers/
│   │       ├── Services/
│   │       ├── Repositories/
│   │       ├── Models/
│   │       │   ├── Entities/
│   │       │   └── DTOs/
│   │       ├── Data/
│   │       ├── Middleware/
│   │       └── Program.cs
│   ├── tests/
│   │   └── DashboardApi.Tests/
│   └── DashboardApi.sln
├── docker-compose.yml
├── .env.example
└── README.md
```

## Development Workflow

1. **Local Development**
   - Frontend: `npm run dev` (Vite dev server)
   - Backend: `dotnet watch run`
   - Database: `docker-compose up postgres`

2. **Testing**
   - Frontend: `npm test` (Vitest)
   - Backend: `dotnet test`

3. **Build**
   - Frontend: `npm run build`
   - Backend: `dotnet publish`
