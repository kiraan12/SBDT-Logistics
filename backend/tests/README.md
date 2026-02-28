# Backend tests (pytest + FastAPI TestClient)

## Setup

```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt
```

Use a **test database** so dev data is not affected. For example in `.env.test` or CI:

- `DATABASE_URL=postgresql://user:pass@localhost/sbdt_test`

Then run migrations so the test DB has the schema:

```bash
alembic upgrade head
```

## Run tests

```bash
cd backend
pytest
```

Options:

- `pytest -v` — verbose
- `pytest tests/test_health.py` — single file
- `pytest --tb=long` — full tracebacks
- `pytest --cov=app --cov-report=html` — coverage (add `pytest-cov`)

Each test runs in a transaction that is rolled back, so the database is left unchanged.
