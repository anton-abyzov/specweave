# Database Rules
> Project-specific patterns learned from corrections.
> Max 30 rules, auto-deduplicated.

- → SpecWeave itself uses file-based storage (JSON in .specweave/), NOT databases
- → For user projects with databases: prefer ORM (Prisma for SQL, Mongoose for MongoDB) over raw queries for type safety and migrations
- → Only use raw SQL/queries when ORM limitations require it (complex joins, performance-critical operations)
