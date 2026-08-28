from pathlib import Path

import cv2
try:
    import mediapipe as mp
except ImportError:
    mp = None

PROJECT_ROOT = Path(__file__).parent.parent
VIDEO_PATH = PROJECT_ROOT / "final_output.mp4"
MODEL_PATH = (PROJECT_ROOT / "models" / "face_landmarker.task")

# Video Analysis Code



