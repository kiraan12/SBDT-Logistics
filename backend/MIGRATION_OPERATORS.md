# Operator management – database update

The `User` model now has an optional `phone` column for operator details.

If your database already exists, add the column (PostgreSQL):

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR;
```

If you create the database from scratch (e.g. with SQLAlchemy `create_all()`), no extra step is needed.
