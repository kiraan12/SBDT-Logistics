# 🚀 Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ PostgreSQL installed and running
- ✅ Redis installed and running  
- ✅ Python 3.10+ installed
- ✅ Node.js 18+ and npm installed

## Step-by-Step Setup

### 1. Database Setup

**Create PostgreSQL database:**
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE sbdt_logistics;

-- Exit
\q
```

### 2. Backend Setup

```powershell
# Navigate to backend
cd backend

# Activate virtual environment (if not already activated)
..\venv\Scripts\Activate.ps1

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Setup database (run migrations + seed admin user)
.\setup_db.ps1
```

**Or manually:**
```powershell
# Run migrations
alembic upgrade head

# Seed admin user
python -m app.initial_data
```

### 3. Start Services

**Terminal 1 - Start Redis:**
```powershell
# If Redis is installed as Windows service, it should already be running
# Otherwise, use Docker:
docker run -d -p 6379:6379 redis

# Or if you have Redis installed locally:
redis-server
```

**Terminal 2 - Start Celery Worker:**
```powershell
cd backend
.\start_celery.ps1
```

**Terminal 3 - Start FastAPI Backend:**
```powershell
cd backend
.\start_backend.ps1
```

**Terminal 4 - Start Frontend:**
```powershell
cd frontend
.\start_frontend.ps1
```

### 4. Access the Application

- **Frontend:** http://localhost:5173 (or port shown in terminal)
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **Admin Login:**
  - Email: `admin@sbdt.com`
  - Password: `admin123`

## 🧪 Testing the Application

### 1. Login
- Navigate to http://localhost:5173/login
- Use admin credentials to login

### 2. Create a Shipment (Manual Entry)
- Click "New Scan" → "Skip Scan & Enter Manually"
- Fill in required fields (LR No, Boxes, Weight, Invoice Value)
- Click "Create Shipment"

### 3. Test Scanning (if you have an E-Way Bill image)
- Click "New Scan"
- Upload an image/PDF of an E-Way Bill
- Wait for OCR processing (check Celery worker terminal)
- Review extracted data and create shipment

### 4. View Shipments
- Navigate to "Shipments" page
- Use search to filter shipments
- Click print icon to view PDF

### 5. Export Data
- Navigate to "Exports" page
- Click "Download Excel Report"
- Verify Excel file downloads with all shipments

### 6. View Analytics
- Navigate to "Analytics" page
- View dashboard statistics and trends

## 🔧 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Verify `.env` file exists with correct database credentials
- Check port 8000 is not in use

### Celery worker not processing jobs
- Verify Redis is running: `redis-cli ping`
- Check Celery worker terminal for errors
- Ensure Redis is accessible on localhost:6379

### Frontend can't connect to backend
- Verify backend is running on http://localhost:8000
- Check CORS settings (should allow all origins in dev)
- Check browser console for errors

### Database connection errors
- Verify PostgreSQL is running
- Check database `sbdt_logistics` exists
- Verify credentials in `.env` file

### OCR not working
- First run downloads PaddleOCR models (may take time)
- Check internet connection
- Verify OpenCV is installed: `python -c "import cv2"`

## 📝 Environment Variables

If you need to customize settings, edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost/sbdt_logistics
REDIS_HOST=localhost
REDIS_PORT=6379
SECRET_KEY=your-secret-key-here
```

## 🎯 Next Steps

1. **Customize PDF Template:** Edit `backend/app/services/pdf_service.py`
2. **Adjust OCR Extraction:** Modify `backend/app/services/ocr_service.py`
3. **Add More Fields:** Update models in `backend/app/models/all_models.py`
4. **Customize UI:** Edit components in `frontend/src/components/`

## 📚 Additional Resources

- Backend API Docs: http://localhost:8000/docs
- FastAPI Documentation: https://fastapi.tiangolo.com/
- React Documentation: https://react.dev/
- Celery Documentation: https://docs.celeryq.dev/
