import cv2
import numpy as np

# Create a blank black image
image = np.zeros((512, 512, 3), dtype=np.uint8)

# Draw a green line
cv2.line(
    image,
    (0, 0),
    (511, 511),
    (0, 255, 0),
    5,
)

# Draw a red rectangle
cv2.rectangle(
    image,
    (300, 50),
    (500, 200),
    (0, 0, 255),
    3,
)

# Draw a blue circle
cv2.circle(
    image,
    (250, 250),
    75,
    (255, 0, 0),
    -1,
)

cv2.imshow("My First OpenCV Image", image)

# Keep the window open until a key is pressed
cv2.waitKey(0)
cv2.destroyAllWindows()