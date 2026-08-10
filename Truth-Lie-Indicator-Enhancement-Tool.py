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

# 6) Temporary Video Writer =====================================================================
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

# 7) Video Timing Variables =====================================================================
# =====================================================================================
frame_count = 0
video_start_time = None
video_end_time = None

# 8) Camera Window =====================================================================
# =====================================================================================
cv2.namedWindow("Camera")

print("Recording ready.")
print("Press Q or Escape to stop.") # This is a temporary thing, since the webpage will not need this

# 9) Audio + Video Recordings =====================================================================
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
            
              # Q or Escape
            if key == ord("q") or key == 27:
                break

            # X button
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

# 10) Save Audio =====================================================================
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

# 11) Calculate Real Video FPS =====================================================================
# =====================================================================================
recording_duration = (
    video_end_time - video_start_time
)

actual_fps = (
    frame_count / recording_duration
)

print()
print("---Recording Stats---")
print("Frames captured:", frame_count)
print("Real elapsedtime", f"{recording_duration:.3f} seconds")
print("Actual capture FPS:", 
      f"{actual_fps:.3f}")
print("VideoWriter FPS:", FPS)

# 12) Correct Video Timeline =====================================================================
# =====================================================================================
timeline_ratio = (FPS / actual_fps)

print("Timeline correction:", f"{timeline_ratio:6f}")

# 13) Find FFMPEG =====================================================================
# =====================================================================================
ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
print("Using FFMPEG:", ffmpeg_path)

# 14) Combine + Sync =====================================================================
# =====================================================================================
subprocess.run(
       [
        ffmpeg_path,
        "-y",

        # Video
        "-i", "output.mp4",

        # Audio
        "-i", "output_audio.wav",

        # >>> CHANGE:
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

""" 
#----------Audio Settings----------#


device_info = sd.query_devices(kind = "input") # Provides information for particular device

sample_rate = int(device_info["default_samplerate"]) # Uses device's preferred sample rate

channels = 1 # One channel is available 

audio_frames = [] # Holds chunks of audio while recording 
print("Using microphone:", device_info["name"])
print("Sample rate:", sample_rate)
#----------Audio Callback#----------#
def audio_callback(indata, frames, time_info, status): # Automatically runs when microphone provides another chunk of audio
    if status:
        print("Audio status:", status)
       
    # Stores a copy of incoming audio data
    # indata = numpy array containing current chunk of microphone samples.  
    audio_frames.append(indata.copy()) 

print("Opening camera...")

start_time = time.time()

# Opens up the camera
cam = cv2.VideoCapture(0, cv2.CAP_MSMF)

cam.set(
    cv2.CAP_PROP_FOURCC,
    cv2.VideoWriter_fourcc(*'MJPG')
)
# Initializaing default values
cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
cam.set(cv2.CAP_PROP_FPS, 30.0)

# Print default values set at their values 
print("Width:", cam.get(cv2.CAP_PROP_FRAME_WIDTH))
print("Height:", cam.get(cv2.CAP_PROP_FRAME_HEIGHT))
print("FPS:", cam.get(cv2.CAP_PROP_FPS))

print("Device:", device_info["name"])
print("Host API index:", device_info["hostapi"])
print("Default sample rate:", device_info["default_samplerate"])

# Get the microphone's default sample rate and convert it to an integer.
# The sample rate represents how many audio samples are captured per second.
# For example, 48000 means approximately 48,000 samples are captured each second.
# Using the microphone's default rate helps avoid requesting an unsupported rate.
sample_rate = int(device_info["default_samplerate"])
    
print("Microphone opened successfully.")


# Error check for camera operation
if not cam.isOpened():
    print("Could not open camera.")
    exit()

# Establishing frame width and height
frame_width = int(cam.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT))

# Specifies the video codec (the compressor) that OPENCV will use when saving a video 
# How the video will be encoded (e.g., mp4, avi, pdf, txt, etc.)
# mp4v is one of the codecs
fourcc = cv2.VideoWriter_fourcc(*'mp4v')

# Object responsible for writing the video, parameters in order: filename, fourcc, fps, frameSize.
# frameSize can be a tuple including frame_width and frame_height
out = cv2.VideoWriter(
    'output.mp4',
    fourcc,
    30.0,
    (frame_width, frame_height)
)

# fps = cam.get(cv2.CAP_PROP_FPS)
# print(f"Camera FPS: {fps}")

frame_count = 0

# Creates a window called "Camera" before presenting images
cv2.namedWindow("Camera")

print("Camera:", frame_width, "x", frame_height)
print("Microphone:", device_info["name"])
print("Audio sample rate:", sample_rate)

print("Recording started")

# Note: THIS FEATURE WILL BE OVERWRITTEN BY WEBPAGE FEATURES.
print("Press Q or escape to stop") 
# Main camera loop: Repeatedly acquire frames from the webcam, 
# write them to the output video, display the live stream, and 
# check for exit conditions until recording is stopped.

# Input stream starts mic capture
# Audio callback runs automatically while executions continue in video loop
with sd.InputStream(
    samplerate=sample_rate,
    channels=channels,
    dtype="float32",
    callback=audio_callback
):
    
    try:
        while True:   
            
            # Get one video frame from camera         
            ret, frame = cam.read()
            if not ret:
                print("Could not read frame from camera.")
                break
            elapsed = time.time() - start_time
            
            if not ret:
                print("Could not read frame from camera.")
                break
            
            # Save the current video frame to mp4 file
            out.write(frame)
            
            # Display camera
            cv2.imshow("Camera", frame)
            
            # Check keyboard input
            key = cv2.waitKey(1) & 0xFF

            # Q or Escape to quit recording
            if key == ord('q') or key == 27:
                break
            
            # Click X on camera to close. Note: These two lines for quitting the recording 
            # will not be in the web page features that will be responsible for shutting down
            # the recording. 
            if cv2.getWindowProperty("Camera", cv2.WND_PROP_VISIBLE) < 1: 
                break
            

    # End stream, finalize and release cam, finish writing video, and clear windows
    finally:
        cam.release()
        out.release()
        cv2.destroyAllWindows()
        
    # np.concatenate joins multiple chunks of audio into one recording
    if audio_frames:
        audio_data = np.concatenate(audio_frames, axis=0)
        
        # Save complete file as a .wav file
        write("output_audio.wav", sample_rate, audio_data)
        
        print("Audio saved")
    
    print("Video saved as output.mp4")
    print("Audio saved as output_audio.wav")
    print("Recording session finished")
    
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    print("Using FFmpeg:", ffmpeg_path)
    # Automatically combine the recorded video and audio into one MP4 file
    subprocess.run([
        ffmpeg_path,
        "-y",
        "-i", "output.mp4",
        "-i", "output_audio.wav",
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        "final_output.mp4"
    ], check = True)
# message
print("Final video saved as final_output.mp4")
print("Farewell")

#############################################################################
# Process:
# 1) Created opencv video that plays, processes frames, and saves video file +
# 2) Resolve video frame issue (It's kind of slow right now)                 +
# 3) Add in audio                                                            - 
# 4) Look into tracking audio (Audio Data)                                   -
# 5) Look into conducting facial expressions, mannerisms, etc. (Visual Data) - 
# .
# .
# .
# n) Look into connecting all of this into a web page, that responds to      - 
# clicks for beginning recording sessions, compiling data, and putting 
# it in a pdf. 

"""