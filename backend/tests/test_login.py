"""Login and auth endpoint tests."""

import pytest
from app.models.all_models import User, UserRole
from app.core import security


@pytest.fixture
def test_user(db_session):
    """Create a test user for login (same transaction, rolled back after test)."""
    user = User(
        email="test@example.com",
        hashed_password=security.get_password_hash("testpass123"),
        full_name="Test User",
        role=UserRole.OPERATOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()  # get ID without committing; rollback in fixture cleans up
    return user


def test_login_success(client, test_user):
    """POST /api/v1/login/access-token returns token for valid credentials."""
    response = client.post(
        "/api/v1/login/access-token",
        data={"username": "test@example.com", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert "access_token" in data
    assert len(data["access_token"]) > 0


def test_login_wrong_password(client, test_user):
    """Login with wrong password returns 400."""
    response = client.post(
        "/api/v1/login/access-token",
        data={"username": "test@example.com", "password": "wrong"},
    )
    assert response.status_code == 400
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_user(client):
    """Login with unknown email returns 400."""
    response = client.post(
        "/api/v1/login/access-token",
        data={"username": "nobody@example.com", "password": "any"},
    )
    assert response.status_code == 400
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_empty_username(client):
    """Login with empty username returns 400."""
    response = client.post(
        "/api/v1/login/access-token",
        data={"username": "", "password": "testpass123"},
    )
    assert response.status_code == 422  # validation error for form


def test_me_requires_auth(client):
    """GET /api/v1/login/me returns 401 without token."""
    response = client.get("/api/v1/login/me")
    assert response.status_code == 401


def test_me_success(client, test_user):
    """GET /api/v1/login/me returns current user with valid token."""
    login = client.post(
        "/api/v1/login/access-token",
        data={"username": "test@example.com", "password": "testpass123"},
    )
    token = login.json()["access_token"]
    response = client.get(
        "/api/v1/login/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"
    assert data["role"] == "OPERATOR"
