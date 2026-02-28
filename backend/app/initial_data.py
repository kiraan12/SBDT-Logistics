"""Create or reset default users. Run with: python -m app.initial_data (from backend dir).

Admin and owner credentials are read from environment / .env:
  INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD
  INITIAL_OWNER_EMAIL, INITIAL_OWNER_PASSWORD
Set these in .env for real credentials; do not commit real passwords to the repo.
"""
import logging
from app.db.session import SessionLocal
from app.models.all_models import User, UserRole
from app.core.security import get_password_hash
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ensure_initial_users_if_empty() -> bool:
    """
    If the users table is empty, create default admin/operator/manager/owner.
    Returns True if any user was created. Safe to call on every startup (no-op if users exist).
    """
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return False
        _create_default_users(db)
        db.commit()
        logger.info("Initial users created (admin, operator, manager, owner).")
        return True
    except Exception as e:
        logger.exception("ensure_initial_users_if_empty failed: %s", e)
        db.rollback()
        return False
    finally:
        db.close()


def _get_seed_users() -> list[tuple[str, str, str, UserRole]]:
    """Admin and owner from settings (.env); operator/manager use placeholders."""
    return [
        (settings.INITIAL_ADMIN_EMAIL, "Admin User", settings.INITIAL_ADMIN_PASSWORD, UserRole.ADMIN),
        ("operator@sbdt.com", "Portal User", "operator123", UserRole.OPERATOR),
        ("manager@sbdt.com", "Manager User", "manager123", UserRole.MANAGER),
        (settings.INITIAL_OWNER_EMAIL, "Owner User", settings.INITIAL_OWNER_PASSWORD, UserRole.OWNER),
    ]


def _create_default_users(db) -> None:
    for email, full_name, password, role in _get_seed_users():
        if db.query(User).filter(User.email == email).first():
            continue
        db.add(User(
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            role=role,
            is_active=True,
        ))


def init_db() -> None:
    """Create or reset default users (resets passwords from INITIAL_* env / .env)."""
    db = SessionLocal()
    for email, full_name, password, role in _get_seed_users():
        user = db.query(User).filter(User.email == email).first()
        if not user:
            db.add(User(
                email=email,
                full_name=full_name,
                hashed_password=get_password_hash(password),
                role=role,
                is_active=True,
            ))
            logger.info("Created user %s", email)
        else:
            user.hashed_password = get_password_hash(password)
            logger.info("Password reset for %s", email)
    db.commit()
    db.close()

if __name__ == "__main__":
    logger.info("Creating initial data")
    init_db()
    logger.info("Initial data created")
