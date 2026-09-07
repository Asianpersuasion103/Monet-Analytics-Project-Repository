from pathlib import Path

from fastapi import FastAPI
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import UploadFile

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from database import Base
from database import SessionLocal
from database import engine

from models import Resume


# ==================================================
# CREATE DATABASE TABLES
# ==================================================

Base.metadata.create_all(
    bind=engine
)


# ==================================================
# FASTAPI APPLICATION
# ==================================================

app = FastAPI(
    title="Resume API"
)


#=================================================
#FOR POLLINATION AI STUFF , SETUP AND ANALYSIS

@app.post("/resumes/{resume_id}/analyze")
def analyze_resume(
    resume_id: int,
    description: str = Form(...)
):

    db = SessionLocal()

    try:

        # Find resume in SQLite
        resume = (
            db.query(Resume)
            .filter(Resume.id == resume_id)
            .first()
        )

        if not resume:
            raise HTTPException(
                status_code=404,
                detail="Resume not found."
            )

        # Get extracted resume text
        resume_text = resume.extracted_text

        # Send resume + job description to Pollinations
        response = client.chat.completions.create(

            model="openai",

            messages=[

                {
                    "role": "system",
                    "content": """
You are a resume matching assistant.

Compare the resume against the job description.

Analyze:
1. Overall match
2. Matching skills
3. Missing skills
4. Relevant experience
5. Weaknesses
6. Overall explanation

Only use information present in the resume.
Do not invent qualifications.
"""
                },

                {
                    "role": "user",
                    "content": f"""
RESUME:

{resume_text}


JOB DESCRIPTION:

{description}
"""
                }

            ]

        )

        analysis = (
            response
            .choices[0]
            .message
            .content
        )

        return {

            "success": True,

            "resume_id": resume.id,

            "filename": resume.filename,

            "analysis": analysis

        }

    finally:

        db.close()

#=================================================

# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ==================================================
# DIRECTORIES
# ==================================================

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = (
    BASE_DIR /
    "uploads"
)

UPLOAD_DIR.mkdir(
    exist_ok=True
)


# ==================================================
# ALLOWED FILE EXTENSIONS
# ==================================================

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx"
}


# ==================================================
# ALLOWED CONTENT TYPES
# ==================================================

ALLOWED_CONTENT_TYPES = {

    "application/pdf",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

}


# ==================================================
# HOME
# ==================================================

@app.get("/")
def home():

    return {
        "message": "Resume API is running"
    }


# ==================================================
# SAVE RESUME
# ==================================================

@app.post("/resumes")
async def save_resume(

    file: UploadFile = File(...),

    extracted_text: str = Form(...),

    meeting_room: str | None = Form(None),

    meeting_role: str | None = Form(None)

):

    # ==============================================
    # VALIDATE FILE NAME
    # ==============================================

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="Filename is missing."
        )


    # ==============================================
    # GET FILE EXTENSION
    # ==============================================

    extension = (
        Path(file.filename)
        .suffix
        .lower()
    )


    # ==============================================
    # VALIDATE EXTENSION
    # ==============================================

    if extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are allowed."
        )


    # ==============================================
    # VALIDATE CONTENT TYPE
    # ==============================================

    if file.content_type not in ALLOWED_CONTENT_TYPES:

        raise HTTPException(
            status_code=400,
            detail="Invalid document type."
        )


    # ==============================================
    # VALIDATE EXTRACTED TEXT
    # ==============================================

    if not extracted_text or not extracted_text.strip():

        raise HTTPException(
            status_code=400,
            detail="No text was extracted from the resume."
        )


    # ==============================================
    # OPEN DATABASE
    # ==============================================

    db = SessionLocal()


    try:

        # ==========================================
        # CREATE DATABASE RECORD
        # ==========================================

        resume = Resume(

            filename=file.filename,

            file_path="",

            content_type=file.content_type,

            extracted_text=extracted_text,

            meeting_room=meeting_room,

            meeting_role=meeting_role

        )


        db.add(resume)

        db.commit()

        db.refresh(resume)


        # ==========================================
        # CREATE SAVED FILE NAME
        # ==========================================

        saved_filename = (
            f"{resume.id}{extension}"
        )


        file_path = (
            UPLOAD_DIR /
            saved_filename
        )


        # ==========================================
        # SAVE ORIGINAL FILE
        # ==========================================

        contents = await file.read()


        with open(
            file_path,
            "wb"
        ) as output:

            output.write(contents)


        # ==========================================
        # UPDATE FILE PATH
        # ==========================================

        resume.file_path = str(
            file_path
        )


        db.commit()

        db.refresh(resume)


        # ==========================================
        # LOG SUCCESS
        # ==========================================

        print(
            "======================================"
        )

        print(
            "Resume saved."
        )

        print(
            f"ID: {resume.id}"
        )

        print(
            f"Filename: {resume.filename}"
        )

        print(
            f"Extracted text length: {len(extracted_text)}"
        )

        print(
            f"Database: {BASE_DIR / 'resumes.db'}"
        )

        print(
            "======================================"
        )


        # ==========================================
        # RETURN RESULT
        # ==========================================

        return {

            "success":
                True,

            "id":
                resume.id,

            "filename":
                resume.filename,

            "content_type":
                resume.content_type,

            "extracted_text":
                resume.extracted_text,

            "meeting_room":
                resume.meeting_room,

            "meeting_role":
                resume.meeting_role,

            "created_at":
                resume.created_at,

            "message":
                "Resume saved successfully."

        }


    except Exception as error:

        db.rollback()

        print(
            "Error saving resume:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Could not save resume."
        )


    finally:

        db.close()


# ==================================================
# GET RESUME
# ==================================================

@app.get("/resumes/{resume_id}")
def get_resume(
    resume_id: int
):

    db = SessionLocal()


    try:

        resume = (
            db.query(Resume)
            .filter(
                Resume.id == resume_id
            )
            .first()
        )


        if not resume:

            raise HTTPException(
                status_code=404,
                detail="Resume not found."
            )


        return {

            "success":
                True,

            "id":
                resume.id,

            "filename":
                resume.filename,

            "content_type":
                resume.content_type,

            "extracted_text":
                resume.extracted_text,

            "meeting_room":
                resume.meeting_room,

            "meeting_role":
                resume.meeting_role,

            "created_at":
                resume.created_at

        }


    finally:

        db.close()


# ==================================================
# GET ORIGINAL FILE
# ==================================================

@app.get("/resumes/{resume_id}/file")
def get_resume_file(
    resume_id: int
):

    db = SessionLocal()


    try:

        resume = (
            db.query(Resume)
            .filter(
                Resume.id == resume_id
            )
            .first()
        )


        if not resume:

            raise HTTPException(
                status_code=404,
                detail="Resume not found."
            )


        file_path = Path(
            resume.file_path
        )


        if not file_path.exists():

            raise HTTPException(
                status_code=404,
                detail="Resume file does not exist."
            )


        return FileResponse(

            path=file_path,

            media_type=resume.content_type,

            filename=resume.filename

        )


    finally:

        db.close()


# ==================================================
# DELETE RESUME
# ==================================================

@app.delete("/resumes/{resume_id}")
def delete_resume(
    resume_id: int
):

    db = SessionLocal()


    try:

        resume = (
            db.query(Resume)
            .filter(
                Resume.id == resume_id
            )
            .first()
        )


        if not resume:

            raise HTTPException(
                status_code=404,
                detail="Resume not found."
            )


        # ==========================================
        # DELETE ORIGINAL FILE
        # ==========================================

        if resume.file_path:

            file_path = Path(
                resume.file_path
            )

            if file_path.exists():

                file_path.unlink()


        # ==========================================
        # DELETE DATABASE RECORD
        # ==========================================

        db.delete(
            resume
        )

        db.commit()


        return {

            "success":
                True,

            "message":
                "Resume deleted successfully."

        }


    finally:

        db.close()
