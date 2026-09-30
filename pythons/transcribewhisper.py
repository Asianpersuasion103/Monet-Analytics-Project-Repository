import whisper
import tempfile
import os

from fastapi import FastAPI, UploadFile, File

app = FastAPI()

model = whisper.load_model("turbo")



@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):

    with tempfile.NamedTemporaryFile(
        suffix=".webm",
        delete=False
    ) as temp:
        temp.write(await file.read())
        audio_path = temp.name

    try:
        result = model.transcribe(audio_path)
        transcript_text = result["text"]

        txt_filename = f"transcript_{file.filename}.txt" 
        
        with open(txt_filename, "w", encoding="utf-8") as txt_file:
            txt_file.write(transcript_text)
        # ------------------------

        return {
            "transcript": transcript_text,
            "saved_to": txt_filename
        }

    finally:
        os.remove(audio_path)


