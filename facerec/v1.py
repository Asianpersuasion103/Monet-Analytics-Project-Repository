import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import numpy as np
import torchvision.models as models
import cv2
import os
import json
import time
from io import BytesIO

# Emotion labels
EMOS = ["Neutral","Happy","Sad","Angry","Surprised","Scared","Disgusted"]
device = "cuda" if torch.cuda.is_available() else "cpu"


# ============================================================
# LOAD MODEL
# ============================================================
def load_model(checkpoint_path):

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"❌ MODEL NOT FOUND: {checkpoint_path}")

    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(1280, 7)

    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    model = model.to(device)
    model.eval()

    print(f"✅ Model loaded from: {checkpoint_path}")
    print(f"🟢 Device: {device}")
    return model


# ============================================================
# PREPROCESSING
# ============================================================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])


# ============================================================
# FORMAT EMOTION VECTOR
# ============================================================
def format_emotion(output):
    output = np.clip(output, 0, None)
    output = output / output.sum()

    vector = {EMOS[i]: float(output[i]) for i in range(7)}
    dominant = EMOS[np.argmax(output)]

    return vector, dominant


# ============================================================
# PREDICT FROM BYTES  (FASTAPI USES THIS)
# ============================================================
def predict_image_bytes(model, image_bytes):

    # Convert bytes → PIL Image
    img = Image.open(BytesIO(image_bytes)).convert("RGB")

    # Preprocess
    img_tensor = transform(img).unsqueeze(0).to(device)

    # Predict
    with torch.no_grad():
        output = model(img_tensor).cpu().numpy()[0]

    # Format result
    vector, dominant = format_emotion(output)

    return vector, dominant


# ============================================================
# OLD FUNCTION (FILEPATH) - NOT USED ANYMORE
# ============================================================
def predict_image(model, img_path):

    if not os.path.exists(img_path):
        raise FileNotFoundError(f"❌ Image Not Found: {img_path}")

    img = Image.open(img_path).convert("RGB")
    img_tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(img_tensor).cpu().numpy()[0]

    vector, dominant = format_emotion(output)

    return vector, dominant