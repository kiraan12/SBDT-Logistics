"""Health and root endpoint tests."""


def test_health_check(client):
    """GET /health returns ok and project name."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "project" in data
    assert "celery_enabled" in data


def test_root(client):
    """GET / returns welcome message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "API" in data["message"]


def test_api_v1_health(client):
    """GET /api/v1/health returns ok and project name."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "project" in data
    assert "celery_enabled" in data
