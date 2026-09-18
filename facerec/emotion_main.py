from fastapi import FastAPI, UploadFile, File
from modules.v1 import load_model, predict_image_bytes

app = FastAPI()

# Load model once on startup
model = load_model("model/newlatest_model.pth")

@app.post("/predics")
async def upload_image(file: UploadFile = File(...)):
    # Read uploaded file as bytes
    content = await file.read()

    # Predict emotion
    vector, dominant = predict_image_bytes(model, content)

    return {
        "dominant": dominant,
        "vector": vector
    }

@app.get("/")
def home():
    return {"message": "Emotion API Running!"}
    