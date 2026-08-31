from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker


# ==================================================
# DATABASE PATH
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

DATABASE_FILE = BASE_DIR / "resumes.db"

DATABASE_URL = f"sqlite:///{DATABASE_FILE}"


# ==================================================
# DATABASE ENGINE
# ==================================================

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False
    }
)


# ==================================================
# DATABASE SESSION
# ==================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ==================================================
# BASE MODEL
# ==================================================

Base = declarative_base()
