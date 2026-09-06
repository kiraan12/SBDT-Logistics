# SBDT Logistics Web Application

A comprehensive logistics management system with document scanning, OCR extraction, shipment tracking, and reporting capabilities.

## 🏗️ Project Structure

```
SBDT/
├── backend/          # FastAPI backend application
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Configuration, security, dependencies
│   │   ├── db/       # Database session and base
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── services/ # Business logic (OCR, PDF, Excel)
│   │   └── worker.py # Celery worker configuration
│   ├── alembic/      # Database migrations
│   └── requirements.txt
└── frontend/         # React + Vite frontend application
    ├── src/
    │   ├── components/  # React components
    │   ├── pages/       # Page components
    │   ├── services/    # API service layer
    │   └── types/       # TypeScript types
    └── package.json
```

## 🚀 Quick Start

### Prerequisites

- Python 3.14+ (or 3.10+)
- Node.js 18+ and npm
- PostgreSQL 12+
- Redis 6+

### Backend Setup

1. **Create and activate virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   # Copy .env.example to .env and update values
   cp .env .env.example  # Edit .env with your database credentials
   ```

4. **Setup PostgreSQL database:**
   ```sql
   CREATE DATABASE sbdt_logistics;
   ```

5. **Run migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Seed admin user:**
   ```bash
   python -m app.initial_data
   ```
   Default admin credentials:
   - Email: `admin@sbdt.com`
   - Password: `admin123`

7. **Start Redis** (required for Celery):
   ```bash
   # Windows (using WSL or Docker)
   redis-server
   # Or use Docker:
   docker run -d -p 6379:6379 redis
   ```

8. **Start Celery worker** (in a separate terminal):
   ```bash
   cd backend
   celery -A app.worker.celery_app worker --loglevel=info
   ```

9. **Start FastAPI server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173 (or port shown in terminal)
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### User Portal vs Admin Panel

- **Admin/Manager** (e.g. `admin@sbdt.com` / `admin123`): After login → **Admin Panel** (Shipments, Analytics, Exports, all data).
- **Operator** (e.g. `operator@sbdt.com` / `operator123`): After login → **User Portal** (Scan E-Way Bill, My Shipments, Export my data to Excel). Data created here appears in the admin panel and in the admin Excel export.

## 📋 Features

### Phase 1: Project Initialization ✅
- ✅ Monorepo structure (backend, frontend)
- ✅ Python venv, PostgreSQL, Redis setup
- ✅ Backend dependencies (FastAPI, SQLAlchemy, Celery, OpenCV, PaddleOCR)
- ✅ Frontend dependencies (Vite, React, Tailwind)

### Phase 2: Backend Core ✅
- ✅ Database Models (Users, Shipments, ScanJobs, ShipmentFiles)
- ✅ Alembic Migrations & Admin User Seeding
- ✅ JWT Authentication with Role-based Access
- ✅ Celery/Redis Background Worker Setup

### Phase 3: Scanning & Extraction Pipeline ✅
- ✅ Image Preprocessing with OpenCV
- ✅ QR Code Decoding (pyzbar)
- ✅ OCR Fallback (PaddleOCR)
- ✅ Scan API endpoints (`POST /api/v1/scan/extract`, `GET /api/v1/scan/jobs/{id}`)

### Phase 4: Shipment Management ✅
- ✅ Shipment CRUD API
- ✅ Excel Export (openpyxl)
- ✅ PDF Generation (WeasyPrint)
- ✅ Tracking & Analytics APIs

### Phase 5: Frontend Implementation ✅
- ✅ Layout (Sidebar, Topbar) & Routing
- ✅ Login Page (connected to backend)
- ✅ Shipments List with Filters
- ✅ New Shipment Flow (Scan → Review → Create)
- ✅ Shipment Details, Delivery Update, & Print View
- ✅ Analytics Dashboard
- ✅ **User Portal**: Operators can scan e-way bills, create shipments, view their shipments, and export their data to Excel; data appears in admin panel and in admin Excel export

### Phase 6: Verification & Polish 🔄
- ⏳ End-to-End Workflow Verification
- ⏳ Excel Export Format Verification
- ⏳ Code Cleanup & Linting

## 🔑 API Endpoints

### Authentication
- `POST /api/v1/login/access-token` - Login and get JWT token
- `GET /api/v1/login/me` - Get current user info

### Shipments
- `GET /api/v1/shipments/` - List shipments (with search filter)
- `POST /api/v1/shipments/` - Create new shipment
- `GET /api/v1/shipments/{id}` - Get shipment details
- `PUT /api/v1/shipments/{id}` - Update shipment
- `GET /api/v1/shipments/{id}/pdf` - Generate PDF
- `GET /api/v1/shipments/export/excel` - Export to Excel

### Scanning
- `POST /api/v1/scan/extract` - Upload file for OCR extraction
- `GET /api/v1/scan/jobs/{id}` - Get scan job status

### Analytics
- `GET /api/v1/analytics/summary` - Dashboard summary stats
- `GET /api/v1/analytics/trends` - Shipment volume trends

## 🗄️ Database Schema

### Users
- `id`, `email`, `full_name`, `hashed_password`, `role`, `is_active`, `created_at`

### Shipments
- `id` (UUID), `lr_no`, `branch_name`, `inv_no`, `invoice_value`, `boxes`, `weight`
- `consignor_name`, `consignor_address`, `consignee_name`, `consignee_address`
- `source`, `destination`, `vehicle_no`
- `booking_date`, `ship_date`, `expected_delivery_date`, `eta`, `actual_delivery_date`
- `delivery_status`, `remarks`, `created_by_id`, `created_at`, `updated_at`

### ScanJobs
- `id`, `status`, `input_file_path`, `extracted_data`, `confidence_scores`, `raw_text`, `created_at`, `updated_at`

### ShipmentFiles
- `id`, `shipment_id`, `file_type`, `file_path`, `created_at`

## 🛠️ Development

### Running Tests
```bash
# Backend tests (when implemented)
cd backend
pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Formatting
```bash
# Backend (using black, when configured)
black app/

# Frontend (using prettier, when configured)
npm run format
```

## 📝 Environment Variables

### Backend (.env)
```env
PROJECT_NAME="SBDT Logistics"
API_V1_STR="/api/v1"
SECRET_KEY="your-secret-key-here"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sbdt_logistics
DATABASE_URL=postgresql://postgres:postgres@localhost/sbdt_logistics

REDIS_HOST=localhost
REDIS_PORT=6379

UPLOAD_DIR=uploads
```

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `pg_isready`
- Check `.env` file has correct database credentials
- Verify database exists: `psql -l | grep sbdt_logistics`

### Redis Connection Issues
- Ensure Redis is running: `redis-cli ping`
- Check Redis port (default: 6379)

### Celery Worker Not Processing Jobs
- Ensure Redis is running
- Check worker logs for errors
- Verify task is registered: `celery -A app.worker.celery_app inspect registered`

### OCR Not Working
- PaddleOCR downloads models on first run (may take time)
- Check internet connection for model downloads
- Verify OpenCV is installed: `python -c "import cv2; print(cv2.__version__)"`

## 📄 License

Kiran 


