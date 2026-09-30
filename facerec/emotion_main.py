import base64
import os

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile

load_dotenv()

app = FastAPI()

API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise ValueError("API_KEY environment variable not set")

API_ENDPOINT = (
    "https://metrics.monetanalytics.com/"
    "FaceReaderPOSTv8/api/facereaderservice/PostImage"
)


@app.post("/upload-image/")
async def upload_image(file: UploadFile = File(...)):
    # Read uploaded file
    content = await file.read()

    # Convert image to base64
    encoded_image = base64.b64encode(content).decode("utf-8")

    # Same payload as working Node.js implementation
    payload = {
        "sessionInfo": f"12345{file.filename}",
        "data": "BASIC",
        "myImage": encoded_image,
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    print("API key exists:", bool(API_KEY))
    print("API key length:", len(API_KEY))
    print("Filename:", file.filename)
    print("Image size:", len(content))
    print("Base64 length:", len(encoded_image))
    print("Base64 starts:", encoded_image[:30])
    print("Payload keys:", payload.keys())

    response = requests.post(
        API_ENDPOINT,
        json=payload,
        headers=headers,
        timeout=10,
    )

    print("Status:", response.status_code)
    print("Response headers:", response.headers)
    print("Response:", response.text[:1000])

    try:
        result = response.json()
    except ValueError:
        result = {"raw_response": response.text}

    return {
        "status": response.status_code,
        "result": result,
    }


@app.get("/")
def home():
    return {"message": "Emotion API Running!"}