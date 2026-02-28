# 🚀 Quick Start Guide - Running SBDT Logistics

## Current Status

✅ **Core backend packages installed**  
⚠️ **PostgreSQL needs to be started**  
⚠️ **Redis needs to be started**  
✅ **Frontend ready**

---

## Step 1: Start PostgreSQL

**Option A: If PostgreSQL is installed**
```powershell
# Check if PostgreSQL service exists
Get-Service -Name "*postgresql*"

# Start PostgreSQL service (if found)
Start-Service -Name "*postgresql*"

# Or start manually from Services app (services.msc)
```

**Option B: Create database manually**
```sql
-- Connect to PostgreSQL (using psql or pgAdmin)
CREATE DATABASE sbdt_logistics;
```

**Option C: Use Docker (if PostgreSQL not installed)**
```powershell
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sbdt_logistics postgres
```

---

## Step 2: Start Redis

**Option A: Start Windows Service**
```powershell
Start-Service -Name "*redis*"
```

**Option B: Use Docker**
```powershell
docker run -d -p 6379:6379 redis
```

**Option C: Manual Start**
- Open Services (services.msc)
- Find Redis service
- Right-click → Start

---

## Step 3: Setup Database

Once PostgreSQL is running:

```powershell
cd backend
..\venv\Scripts\Activate.ps1

# Run migrations
alembic upgrade head

# Seed admin user
python -m app.initial_data
```

---

## Step 4: Start Backend Services

**Terminal 1 - Start Celery Worker:**
```powershell
cd backend
..\venv\Scripts\Activate.ps1
celery -A app.worker.celery_app worker --loglevel=info
```

**Terminal 2 - Start FastAPI Backend:**
```powershell
cd backend
..\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

---

## Step 5: Start Frontend

**Terminal 3 - Start Frontend:**
```powershell
cd frontend
npm run dev
```

---

## Step 6: Access Application

- **Frontend:** http://localhost:5173 (or port shown)
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

**Login Credentials:**
- Email: `admin@sbdt.com`
- Password: `admin123`

---

## Troubleshooting

### PostgreSQL Connection Error
- Ensure PostgreSQL is running
- Check database `sbdt_logistics` exists
- Verify credentials in `backend/.env`

### Redis Connection Error
- Ensure Redis is running on port 6379
- Check: `redis-cli ping` (should return PONG)

### Missing Dependencies
```powershell
# Backend
cd backend
..\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Port Already in Use
- Backend (8000): Change port in `uvicorn` command
- Frontend (5173): Vite will auto-select next available port

---

## Quick Commands

**All-in-one startup (after prerequisites):**
```powershell
# Terminal 1
cd backend; ..\venv\Scripts\Activate.ps1; celery -A app.worker.celery_app worker --loglevel=info

# Terminal 2  
cd backend; ..\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000

# Terminal 3
cd frontend; npm run dev
```

---

**Need help?** Check `README.md` for detailed documentation.
