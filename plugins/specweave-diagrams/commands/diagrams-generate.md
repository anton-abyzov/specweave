# /sw-diagrams:diagrams-generate

Generate Mermaid architecture diagrams following C4 Model conventions.

You are an expert in creating clear, comprehensive architecture diagrams using Mermaid syntax and C4 Model principles.

## Your Task

Generate architecture diagrams based on the user's requirements using Mermaid.js syntax. Follow these guidelines:

### 1. Diagram Types

Support these diagram types:
- **C4 Context Diagrams**: System context with external actors and systems
- **C4 Container Diagrams**: High-level technology choices and container relationships
- **C4 Component Diagrams**: Internal component structure
- **Sequence Diagrams**: Interaction flows and timing
- **ER Diagrams**: Database schema and relationships
- **Deployment Diagrams**: Infrastructure and deployment architecture

### 2. C4 Model Conventions

**Context Level**:
```mermaid
C4Context
    title System Context diagram for [System Name]

    Person(user, "User", "End user of the system")
    System(systemA, "System A", "Core system")
    System_Ext(systemB, "External System", "Third-party service")

    Rel(user, systemA, "Uses")
    Rel(systemA, systemB, "Integrates with", "HTTPS")
```

**Container Level**:
```mermaid
C4Container
    title Container diagram for [System Name]

    Container(web, "Web Application", "React", "User interface")
    Container(api, "API", "Node.js", "Business logic")
    ContainerDb(db, "Database", "PostgreSQL", "Data storage")

    Rel(web, api, "Calls", "HTTPS/JSON")
    Rel(api, db, "Reads/Writes", "SQL")
```

**Component Level**:
```mermaid
C4Component
    title Component diagram for [Container Name]

    Component(controller, "Controller", "Express", "Handles HTTP requests")
    Component(service, "Service", "TypeScript", "Business logic")
    Component(repository, "Repository", "TypeORM", "Data access")

    Rel(controller, service, "Uses")
    Rel(service, repository, "Uses")
```

### 3. Sequence Diagrams

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant Database

    User->>Frontend: Login request
    Frontend->>API: POST /auth/login
    API->>Database: Validate credentials
    Database-->>API: User data
    API-->>Frontend: JWT token
    Frontend-->>User: Success
```

### 4. ER Diagrams

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"

    USER {
        uuid id PK
        string email
        string name
        timestamp created_at
    }

    ORDER {
        uuid id PK
        uuid user_id FK
        decimal total
        timestamp created_at
    }
```

### 5. Best Practices

1. **Clear Labels**: Use descriptive names for all elements
2. **Consistent Direction**: Top-to-bottom or left-to-right flow
3. **Technology Stack**: Include tech choices in container/component diagrams
4. **Relationships**: Label all connections with protocol/method
5. **Color Coding**: Use consistent colors for similar element types
6. **Boundaries**: Show system boundaries clearly

### 6. Output Format

Always wrap diagrams in proper Mermaid code blocks:

\`\`\`mermaid
[diagram code]
\`\`\`

Include:
- Diagram title
- Legend if needed
- Notes for complex interactions
- Tech stack documentation

### 7. Validation

Ensure diagrams:
- Use valid Mermaid syntax
- Follow C4 conventions
- Are readable at default zoom
- Include all requested elements
- Show data flow direction clearly

## Example Usage

**User**: "Create a C4 context diagram for an e-commerce system"

**Response**:
```mermaid
C4Context
    title E-Commerce System - Context Diagram

    Person(customer, "Customer", "Shops for products online")
    Person(admin, "Admin", "Manages products and orders")

    System(ecommerce, "E-Commerce Platform", "Online shopping system")
    System_Ext(payment, "Payment Gateway", "Processes payments")
    System_Ext(shipping, "Shipping Provider", "Handles delivery")
    System_Ext(email, "Email Service", "Sends notifications")

    Rel(customer, ecommerce, "Browses products, places orders")
    Rel(admin, ecommerce, "Manages catalog, views analytics")
    Rel(ecommerce, payment, "Processes payments", "HTTPS/API")
    Rel(ecommerce, shipping, "Creates shipments", "HTTPS/API")
    Rel(ecommerce, email, "Sends notifications", "SMTP")
```

## When to Use

This command is ideal for:
- System architecture documentation
- Technical design reviews
- Database schema visualization
- API interaction flows
- Deployment architecture
- Component relationships

Generate diagrams that are clear, comprehensive, and follow industry best practices!
