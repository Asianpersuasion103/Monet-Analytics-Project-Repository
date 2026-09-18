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
# FORMAT EMOTION VECTOR (MongoDB style)
# ============================================================
def format_emotion(output):
    output = np.clip(output, 0, None)
    output = output / output.sum()

    vector = {EMOS[i]: float(output[i]) for i in range(7)}
    dominant = EMOS[np.argmax(output)]

    return vector, dominant


# ============================================================
# PREDICT ON IMAGE
# ============================================================
def predict_image(model, img_path):

    if not os.path.exists(img_path):
        raise FileNotFoundError(f"❌ Image Not Found: {img_path}")

    img = Image.open(img_path).convert("RGB")
    img_tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(img_tensor).cpu().numpy()[0]

    vector, dominant = format_emotion(output)

    print("\n🧠 Emotion Vector (MongoDB format):")
    print(json.dumps(vector, indent=4))
    print("\n🔥 Dominant Emotion:", dominant)

    return vector, dominant


# ============================================================
# LIVE WEBCAM EMOTION DETECTION + LIVE LOGS
# ============================================================
def predict_webcam(model, show_logs=True):

    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ Webcam not found")
        return

    print("\n🎥 Webcam started — Press 'q' to quit\n")

    last_log_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(img)

        img_tensor = transform(pil_img).unsqueeze(0).to(device)

        with torch.no_grad():
            output = model(img_tensor).cpu().numpy()[0]

        vector, dominant = format_emotion(output)

        # Show text on webcam
        cv2.putText(frame, f"Emotion: {dominant}", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 2)

        cv2.imshow("Emotion Detector", frame)

        # ---------- LIVE LOGGING EVERY 0.4 SECONDS ----------
        if show_logs and time.time() - last_log_time > 0.4:
            print("\n===== LIVE FRAME LOG =====")
            print(json.dumps(vector, indent=4))
            print("Dominant:", dominant)
            last_log_time = time.time()
        # -----------------------------------------------------

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


# ============================================================
# RUN SCRIPT (choose webcam or image)
# ============================================================
if __name__ == "__main__":

    MODEL_PATH = r"C:\Users\allisongalon\Downloads\newlatest_model.pth"

    model = load_model(MODEL_PATH)

    # CHANGE THESE
    RUN_IMAGE = True
    RUN_WEBCAM = False  # Set True to enable webcam

    #IMAGE_PATH = r"C:\Users\allisongalon\Downloads\WhatsApp Image 2025-12-03 at 15.52.27_576f604b.jpg"

    if RUN_IMAGE:
        predict_image(model, IMAGE_PATH)

    if RUN_WEBCAM:
        predict_webcam(model, show_logs=True)
        