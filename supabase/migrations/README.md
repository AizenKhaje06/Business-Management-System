# Supabase Migrations

This directory holds SQL migration files applied via the Supabase MCP `apply_migration` tool.

## Naming convention

```
NNNN_description_in_snake_case.sql
```

Where `NNNN` is a zero-padded sequence number (0001, 0002, ...).

## Notes

- Never use `DROP TABLE`, `DELETE COLUMN`, or rename existing tables — these lose user data.
- Always enable RLS on new tables and write four policies (one per CRUD verb).
- Use `auth.uid()` for ownership checks, never `current_user`.
