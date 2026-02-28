"""
Grant database permissions to sbdt_user
This script uses Python to connect to PostgreSQL and grant necessary permissions.
"""
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

def grant_permissions():
    """Grant necessary permissions to sbdt_user"""
    
    # Connect as postgres superuser to grant permissions
    # We'll use the same connection string but with postgres user
    # First, let's try to connect with the current user and see if we can grant permissions
    # If not, we'll need to connect as postgres
    
    print("Attempting to grant permissions to sbdt_user...")
    
    # Try to connect as postgres user first
    # Extract connection details from DATABASE_URL
    db_url = settings.DATABASE_URL
    
    # Parse the URL: postgresql+psycopg2://sbdt_user:sbdt_pass@localhost:5432/sbdt_logistics
    # We need to replace sbdt_user with postgres
    if "postgresql+psycopg2://" in db_url:
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")
    
    # Try to connect as postgres user
    # You'll need to provide the postgres password
    import getpass
    
    print("\nTo grant permissions, we need to connect as PostgreSQL superuser (postgres).")
    postgres_password = getpass.getpass("Enter PostgreSQL superuser (postgres) password: ")
    
    # Construct postgres connection URL
    # Replace user and password in the URL
    if "@localhost" in db_url:
        parts = db_url.split("@")
        if len(parts) == 2:
            # Replace user:password with postgres:password
            postgres_url = f"postgresql://postgres:{postgres_password}@localhost:5432/sbdt_logistics"
        else:
            print("Error: Could not parse DATABASE_URL")
            return False
    else:
        print("Error: DATABASE_URL format not recognized")
        return False
    
    try:
        # Connect as postgres user
        engine = create_engine(postgres_url, pool_pre_ping=True)
        
        with engine.connect() as conn:
            # Start a transaction
            trans = conn.begin()
            
            try:
                # Grant permissions
                print("Granting USAGE on schema public...")
                conn.execute(text("GRANT USAGE ON SCHEMA public TO sbdt_user"))
                
                print("Granting CREATE on schema public...")
                conn.execute(text("GRANT CREATE ON SCHEMA public TO sbdt_user"))
                
                print("Granting ALL PRIVILEGES on database...")
                conn.execute(text("GRANT ALL PRIVILEGES ON DATABASE sbdt_logistics TO sbdt_user"))
                
                print("Granting privileges on all existing tables...")
                conn.execute(text("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sbdt_user"))
                
                print("Granting privileges on all sequences...")
                conn.execute(text("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sbdt_user"))
                
                print("Setting default privileges for future tables...")
                conn.execute(text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sbdt_user"))
                conn.execute(text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sbdt_user"))
                
                # Commit the transaction
                trans.commit()
                
                print("\n✅ Permissions granted successfully!")
                print("You can now run: alembic upgrade head")
                return True
                
            except Exception as e:
                trans.rollback()
                print(f"\n❌ Error granting permissions: {e}")
                print("\nAlternative: You can run the SQL commands manually using pgAdmin:")
                print("1. Open pgAdmin")
                print("2. Connect to your PostgreSQL server as 'postgres' user")
                print("3. Right-click on 'sbdt_logistics' database → Query Tool")
                print("4. Copy and paste the contents of grant_permissions.sql")
                print("5. Execute the query")
                return False
                
    except Exception as e:
        print(f"\n❌ Error connecting to PostgreSQL: {e}")
        print("\nMake sure:")
        print("- PostgreSQL is running")
        print("- The postgres password is correct")
        print("- You have network access to localhost:5432")
        return False

if __name__ == "__main__":
    success = grant_permissions()
    sys.exit(0 if success else 1)
