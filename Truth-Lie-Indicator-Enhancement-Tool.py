import os

# Changes one Opencv configuration before Openvc initializes
# Speeds up camera initialization and all ahead of time
# The use of MSMF tries to use hardware transformations, which ended up slowing down the camera initialization
# By having this line, this speeds it up so the camera boots up right after hitting "Run" 
os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"
import imageio_ffmpeg
import subprocess
import cv2
import time
import threading
import sounddevice as sd
import numpy as np 
from scipy.io.wavfile import write

# 1) Setting ==========================================================================
# =====================================================================================
FPS = 30.0

# 2) AUDIO ============================================================================
# =====================================================================================

device_info = sd.query_devices(kind="input")
sample_rate = int(device_info["default_samplerate"])
channels = 1
audio_frames = []

print("Using microphone:", device_info["name"])
print("Audio sample rate:", sample_rate)

# 3) Shared Recording State ===========================================================
# =====================================================================================
recording_initiation = threading.Event()

# 4) Audio Callback ===================================================================
# =====================================================================================
def audio_callback(indata, frames, time_info, status):
    if status:
        print("Audio status: ", status)
    if recording_initiation.is_set():
        audio_frames.append(indata.copy())

# 5) Camera Setup =====================================================================
# =====================================================================================

print("Opening camera...")
cam =cv2.VideoCapture(0,cv2.CAP_MSMF)
cam.set(
    cv2.CAP_PROP_FOURCC,
    cv2.VideoWriter_fourcc(*"MJPG")
)

cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
cam.set(cv2.CAP_PROP_FPS, FPS)

if not cam.isOpened():
    print("Could not open camera")
    raise SystemExit

frame_width = int(cam.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT))

print("Width:", frame_width)
print("Height:", frame_height)
print("FPS:", FPS)
print("Reported FPS:", cam.get(cv2.CAP_PROP_FPS))

# 6) Temporary Video Writer ===========================================================
# =====================================================================================

fourcc = cv2.VideoWriter_fourcc(*"mp4v")

out = cv2.VideoWriter(
    "output.mp4",
    fourcc,
    FPS,
    (frame_width, frame_height)
)

if not out.isOpened():
    cam.released()
    print("Could not create output.mp4")
    raise SystemExit

# 7) Video Timing Variables ===========================================================
# =====================================================================================
frame_count = 0
video_start_time = None
video_end_time = None

# 8) Camera Window ====================================================================
# =====================================================================================
cv2.namedWindow("Camera")

print("Recording ready.")
print("Press Q or Escape to stop.") # This is a temporary thing, since the webpage will not need this

# 9) Audio + Video Recordings =========================================================
# =====================================================================================

with sd.InputStream(
    samplerate=sample_rate,
    channels=channels, 
    dtype = "float32", 
    callback=audio_callback
): 
    try: 
        while True:
            ret, frame = cam.read()
            
            if not ret:
                print("Could not read frame from camera.")
                break
            # First valid camera frame defines time as 0
            if video_start_time is None:
                video_start_time = time.perf_counter()
                recording_initiation.set()
                print("Audio/video recording started.")
                
            # Count every successfully captured video frame. 
            frame_count += 1
            
            # Save current frame
            out.write(frame)
            
            # Display current frame
            cv2.imshow("Camera", frame)
            
            key = cv2.waitKey(1) & 0xFF
            
              # Q or Escape --- This is temporary, this will be removed when this code is integrated into a proper webpage
            if key == ord("q") or key == 27:
                break

            # X button --- This is temporary, this will be removed when this code is integrated into a proper webpage
            if cv2.getWindowProperty(
                "Camera",
                cv2.WND_PROP_VISIBLE
            ) < 1:
                break
        
    
    finally:
        recording_initiation.clear()
        video_end_time = time.perf_counter()
        cam.release()
        out.release()
        cv2.destroyAllWindows()

# 10) Save Audio ======================================================================
# =====================================================================================
if not audio_frames:
    raise RuntimeError("No mic audio was captured.")

audio_data = np.concatenate(
    audio_frames,
    axis = 0
)

write(
    "output_audio.wav",
    sample_rate,
    audio_data
)

print("Audio saved as output_audio.wav")
print("Temp vid saved as output.mp4")

# 11) Calculate Real Video FPS ========================================================
# =====================================================================================
recording_duration = (
    video_end_time - video_start_time
)

actual_fps = (
    frame_count / recording_duration
)

print()
print("---Recording Stats---")
print("---------------------")
print("Frames captured:", frame_count)
print("Real elapsedtime", f"{recording_duration:.3f} seconds")
print("Actual capture FPS:", 
      f"{actual_fps:.3f}")
print("VideoWriter FPS:", FPS)

# 12) Correct Video Timeline ==========================================================
# =====================================================================================
timeline_ratio = (FPS / actual_fps)

print("Timeline correction:", f"{timeline_ratio:6f}")

# 13) Find FFMPEG =====================================================================
# =====================================================================================
ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
print("Using FFMPEG:", ffmpeg_path)

# 14) Combine + Sync ==================================================================
# =====================================================================================
subprocess.run(
       [
        ffmpeg_path,
        "-y",

        # Video
        "-i", "output.mp4",

        # Audio
        "-i", "output_audio.wav",

        # Correct the video timeline using the measured FPS.
        "-filter:v",
        f"setpts={timeline_ratio}*PTS",

        # Re-encode corrected video
        "-c:v", "libx264",

        # Faster encoding for development
        "-preset", "veryfast",

        # Encode audio for MP4
        "-c:a", "aac",

        # Stop when the shorter synchronized stream ends
        "-shortest",

        "final_output.mp4"
    ],
    check=True
)
print()
print("Final video saved as final_output.mp4")
print("Recording session finished.")

# Removed past code iteration, no longer needed. 