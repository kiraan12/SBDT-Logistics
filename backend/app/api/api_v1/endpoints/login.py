from datetime import timedelta
import logging
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from sqlalchemy import func
from app.db.session import get_db
from app.core import security, deps
from app.core.config import settings
from app.models.all_models import User, UserRole
from app.schemas.all_schemas import Token, UserResponse, UserCreate, ProfileUpdate, ManagerOption, ManagerCreate, ManagerResponse, OperatorCreate, OperatorResponse, SetPasswordRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    username = (form_data.username or "").strip().lower()
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required",
        )
    try:
        user = db.query(User).filter(func.lower(User.email) == username).first()
    except (SQLAlchemyError, OperationalError, OSError) as e:
        logger.exception("Database error during login: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Ensure PostgreSQL is running and DATABASE_URL in .env is correct.",
        ) from e

    if not user:
        logger.warning(f"Login attempt with non-existent email: {username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    
    if not user.is_active:
        logger.warning(f"Login attempt for inactive user: {username}")
        raise HTTPException(status_code=400, detail="Inactive user")
    if not getattr(user, "hashed_password", None):
        logger.warning(f"User {username} has no password set")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    password = (form_data.password or "")[:72]  # bcrypt 72-byte limit
    try:
        valid = security.verify_password(password, user.hashed_password or "")
        logger.info(f"Password verification for {username}: {valid}")
    except Exception as e:
        logger.error(f"Password verification error for {username}: {e}")
        valid = False
    
    if not valid:
        logger.warning(f"Invalid password for user: {username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )

    logger.info(f"Successful login for {username} (role: {user.role})")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    try:
        access_token = security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    except Exception as e:
        logger.exception("JWT creation error during login: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create session. Check SECRET_KEY is set in .env.",
        ) from e
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(body: UserCreate, db: Session = Depends(get_db)) -> Any:
    """
    Public registration. Creates a new user (default role: OPERATOR, active).
    """
    email = (body.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    password = (body.password or "")[:72]
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = User(
        email=email,
        full_name=(body.full_name or "").strip() or None,
        hashed_password=security.get_password_hash(password),
        role=UserRole.OPERATOR,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Signup: created user %s (id=%s)", email, user.id)
    return {"detail": "Registration successful. You can now sign in."}


@router.get("/me", response_model=UserResponse)
def read_users_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_profile_me(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update current user profile (full_name, phone). Available to all authenticated users.
    """
    if body.full_name is not None:
        current_user.full_name = body.full_name.strip() or None
    if body.phone is not None:
        current_user.phone = body.phone.strip() or None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/managers", response_model=List[ManagerOption])
def list_managers(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    List managers (companies) for dropdown when operator assigns a shipment to a company.
    Allowed for ADMIN, OWNER, and OPERATOR.
    """
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER, UserRole.OPERATOR):
        raise HTTPException(status_code=403, detail="Only admin, owner and operator can list managers")
    users = db.query(User).filter(User.role == UserRole.MANAGER, User.is_active == True).order_by(User.full_name, User.email).all()
    return [ManagerOption(id=u.id, full_name=u.full_name, email=u.email) for u in users]


@router.get("/managers/full", response_model=List[ManagerResponse])
def list_managers_full(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """List all managers with full details. Allowed for ADMIN and OWNER only."""
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Only admin and owner can list managers")
    users = db.query(User).filter(User.role == UserRole.MANAGER, User.is_active == True).order_by(User.full_name, User.email).all()
    return [ManagerResponse(id=u.id, full_name=u.full_name, phone=getattr(u, "phone", None), email=u.email, is_active=u.is_active, created_at=u.created_at) for u in users]


@router.post("/managers", response_model=ManagerResponse)
def create_manager(
    body: ManagerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Create a new manager. Allowed for ADMIN and OWNER only."""
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Only admin and owner can add managers")
    existing = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    hashed = security.get_password_hash(body.password)
    user = User(
        full_name=body.full_name.strip() or None,
        email=body.email.strip().lower(),
        phone=body.phone.strip() if body.phone else None,
        hashed_password=hashed,
        role=UserRole.MANAGER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return ManagerResponse(id=user.id, full_name=user.full_name, phone=user.phone, email=user.email, is_active=user.is_active, created_at=user.created_at)


@router.post("/managers/{manager_id}/set-password")
def set_manager_password(
    manager_id: int,
    body: SetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Set or reset a manager's password. Allowed for ADMIN and OWNER only."""
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Only admin and owner can set manager passwords")
    user = db.query(User).filter(User.id == manager_id, User.role == UserRole.MANAGER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Manager not found")
    user.hashed_password = security.get_password_hash(body.new_password)
    db.commit()
    return {"detail": "Password updated"}


@router.delete("/managers/{manager_id}")
def delete_manager(
    manager_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Deactivate a manager (soft delete). Allowed for ADMIN and OWNER only."""
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Only admin and owner can delete managers")
    user = db.query(User).filter(User.id == manager_id, User.role == UserRole.MANAGER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Manager not found")
    user.is_active = False
    db.commit()
    return {"detail": "Manager deactivated"}


# --- Operators (admin and owner only) ---

@router.get("/operators", response_model=List[OperatorResponse])
def list_operators(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """List all operators. Allowed for ADMIN and OWNER only."""
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Only admin and owner can list operators")
    users = db.query(User).filter(User.role == UserRole.OPERATOR, User.is_active == True).order_by(User.full_name, User.email).all()
    return [OperatorResponse(id=u.id, full_name=u.full_name, phone=getattr(u, "phone", None), email=u.email, is_active=u.is_active, created_at=u.created_at) for u in users]


@router.post("/operators", response_model=OperatorResponse)
def create_operator(
    body: OperatorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Create a new operator. Allowed for ADMIN and OWNER only."""
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Only admin and owner can add operators")
    existing = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    hashed = security.get_password_hash(body.password)
    user = User(
        full_name=body.full_name.strip() or None,
        email=body.email.strip().lower(),
        phone=body.phone.strip() if body.phone else None,
        hashed_password=hashed,
        role=UserRole.OPERATOR,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return OperatorResponse(id=user.id, full_name=user.full_name, phone=user.phone, email=user.email, is_active=user.is_active, created_at=user.created_at)


@router.post("/operators/{operator_id}/set-password")
def set_operator_password(
    operator_id: int,
    body: SetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Set or reset an operator's password. Allowed for ADMIN and OWNER only."""
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Only admin and owner can set operator passwords")
    user = db.query(User).filter(User.id == operator_id, User.role == UserRole.OPERATOR).first()
    if not user:
        raise HTTPException(status_code=404, detail="Operator not found")
    user.hashed_password = security.get_password_hash(body.new_password)
    db.commit()
    return {"detail": "Password updated"}


@router.delete("/operators/{operator_id}")
def delete_operator(
    operator_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Deactivate an operator (soft delete). Allowed for ADMIN and OWNER only."""
    if current_user.role not in (UserRole.ADMIN, UserRole.OWNER):
        raise HTTPException(status_code=403, detail="Only admin and owner can delete operators")
    user = db.query(User).filter(User.id == operator_id, User.role == UserRole.OPERATOR).first()
    if not user:
        raise HTTPException(status_code=404, detail="Operator not found")
    user.is_active = False
    db.commit()
    return {"detail": "Operator deactivated"}