from datetime import datetime

from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

from database import Base


# ==================================================
# RESUME TABLE
# ==================================================

class Resume(Base):

    __tablename__ = "resumes"


    # ==============================================
    # ID
    # ==============================================

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )


    # ==============================================
    # ORIGINAL FILE NAME
    # ==============================================

    filename = Column(
        String,
        nullable=False
    )


    # ==============================================
    # SAVED FILE PATH
    # ==============================================

    file_path = Column(
        String,
        nullable=False
    )


    # ==============================================
    # FILE TYPE
    # ==============================================

    content_type = Column(
        String,
        nullable=False
    )


    # ==============================================
    # EXTRACTED RESUME TEXT
    # ==============================================

    extracted_text = Column(
        Text,
        nullable=False
    )


    # ==============================================
    # MEETING ROOM
    # ==============================================

    meeting_room = Column(
        String,
        nullable=True
    )


    # ==============================================
    # MEETING ROLE
    # ==============================================

    meeting_role = Column(
        String,
        nullable=True
    )


    # ==============================================
    # CREATED TIME
    # ==============================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )
