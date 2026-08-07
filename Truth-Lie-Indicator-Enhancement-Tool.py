import cv2
import time


cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)

if not cam.isOpened():
    print("Could not open camera.")
    exit()

frame_width = int(cam.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT))

fourcc = cv2.VideoWriter_fourcc(*'mp4v')

out = cv2.VideoWriter(
    'output.mp4',
    fourcc,
    10.0,
    (frame_width, frame_height)
)

# fps = cam.get(cv2.CAP_PROP_FPS)
# print(f"Camera FPS: {fps}")

frame_count = 0
start_time = time.time()


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
