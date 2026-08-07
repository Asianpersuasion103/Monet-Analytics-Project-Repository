import os

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

import cv2
import time

print("Opening camera...")

start_time = time.time()
cam = cv2.VideoCapture(0, cv2.CAP_MSMF)

cam.set(
    cv2.CAP_PROP_FOURCC,
    cv2.VideoWriter_fourcc(*'MJPG')
)

cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
cam.set(cv2.CAP_PROP_FPS, 50.0)

print("Width:", cam.get(cv2.CAP_PROP_FRAME_WIDTH))
print("Height:", cam.get(cv2.CAP_PROP_FRAME_HEIGHT))
print("FPS:", cam.get(cv2.CAP_PROP_FPS))

if not cam.isOpened():
    print("Could not open camera.")
    exit()

frame_width = int(cam.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT))

fourcc = cv2.VideoWriter_fourcc(*'mp4v')

out = cv2.VideoWriter(
    'output.mp4',
    fourcc,
    50.0,
    (frame_width, frame_height)
)

# fps = cam.get(cv2.CAP_PROP_FPS)
# print(f"Camera FPS: {fps}")

frame_count = 0

cv2.namedWindow("Camera")

try:
    while True:
        ret, frame = cam.read()
        elapsed = time.time() - start_time
        
        if not ret:
            print("Could not read frame from camera.")
            break
            
        out.write(frame)

        cv2.imshow("Camera", frame)

        key = cv2.waitKey(1) & 0xFF

        # Q or Escape
        if key == ord('q') or key == 27:
            break

        # Detect clicking X on the camera window
        if cv2.getWindowProperty("Camera", cv2.WND_PROP_VISIBLE) < 1:
            break

finally:
    cam.release()
    out.release()
    cv2.destroyAllWindows()

print("Camera closed successfully.")

"""
#############################################################################
Process:
1) Created opencv video that plays, processes frames, and saves video file +
2) Resolve video frame issue (It's kind of slow right now)                 -
3) Add in audio                                                            - 
4) Look into tracking audio (Audio Data)                                   -
5) Look into conducting facial expressions, mannerisms, etc. (Visual Data) - 
.
.
.
n) Look into connecting all of this into a web page, that responds to      - 
clicks for beginning recording sessions, compiling data, and putting 
it in a pdf. 

"""