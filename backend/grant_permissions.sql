-- Grant permissions to sbdt_user for database operations
-- Run this script as a PostgreSQL superuser (e.g., postgres)

-- Connect to the sbdt_logistics database
\c sbdt_logistics

-- Grant usage and create privileges on the public schema
GRANT USAGE ON SCHEMA public TO sbdt_user;
GRANT CREATE ON SCHEMA public TO sbdt_user;

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE sbdt_logistics TO sbdt_user;

-- Grant privileges on all existing tables (if any)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sbdt_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sbdt_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sbdt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sbdt_user;

-- Verify permissions
\du sbdt_user
