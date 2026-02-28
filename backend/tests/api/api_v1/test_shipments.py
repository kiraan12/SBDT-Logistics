from fastapi.testclient import TestClient
from app.core.config import settings
from app.models.all_models import User, UserRole
from app.core import security
import pytest


@pytest.fixture
def auth_headers(client, db_session):
    """Create a test user and return auth headers."""
    user = User(
        email="shipment_test@example.com",
        hashed_password=security.get_password_hash("testpass123"),
        full_name="Shipment Test User",
        role=UserRole.OPERATOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    login = client.post(
        "/api/v1/login/access-token",
        data={"username": "shipment_test@example.com", "password": "testpass123"},
    )
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_read_shipments_unauthenticated(client):
    """GET /shipments/ returns 401 without token."""
    response = client.get(f"{settings.API_V1_STR}/shipments/")
    assert response.status_code == 401


def test_read_shipments_authenticated(client, auth_headers):
    """GET /shipments/ returns 200 with valid token."""
    response = client.get(f"{settings.API_V1_STR}/shipments/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_shipment_unauthenticated(client):
    """POST /shipments/ returns 401 without token."""
    data = {
        "lr_no": "TEST-LR-001",
        "boxes": 10,
        "weight": 500.5,
        "invoice_value": 15000,
        "ship_date": "2024-02-18",
        "destination": "Test Dest",
    }
    response = client.post(f"{settings.API_V1_STR}/shipments/", json=data)
    assert response.status_code == 401


def test_create_shipment_authenticated(client, auth_headers):
    """POST /shipments/ creates a shipment with valid token."""
    data = {
        "lr_no": "TEST-LR-001",
        "boxes": 10,
        "weight": 500.5,
        "invoice_value": 15000,
        "ship_date": "2024-02-18",
        "destination": "Test Dest",
    }
    response = client.post(
        f"{settings.API_V1_STR}/shipments/",
        json=data,
        headers=auth_headers,
    )
    assert response.status_code in (200, 201)
    content = response.json()
    assert content["lr_no"] == "TEST-LR-001"