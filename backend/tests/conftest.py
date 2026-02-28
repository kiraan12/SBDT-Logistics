"""
Pytest fixtures for FastAPI tests.
Overrides get_db so each test runs in a transaction that is rolled back.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.main import app
from app.db.session import get_db
from app.core.config import settings
from app.core import security
from app.models.all_models import User, UserRole

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=1,
    max_overflow=0,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    """Per-test DB session with rollback."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def db(db_session):
    """Alias for db_session so tests can use either name."""
    return db_session


@pytest.fixture
def auth_headers(client, db_session):
    """Create an admin user, log in, and return Authorization headers for API calls."""
    user = User(
        email="admin@test.com",
        hashed_password=security.get_password_hash("admin123"),
        full_name="Admin Test",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    r = client.post(
        "/api/v1/login/access-token",
        data={"username": "admin@test.com", "password": "admin123"},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(db_session):
    """TestClient with overridden get_db (same session per test, rolled back after)."""
    # Return session directly so the app gets Session, not a generator
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)