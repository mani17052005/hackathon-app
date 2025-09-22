import cv2

# Load the pre-trained Haar Cascade model for face detection
face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')

# Initialize video capture from your webcam (0 is usually the default webcam)
video_capture = cv2.VideoCapture(0)

print("Webcam started. Press 'q' to quit.")

# Loop to continuously get frames from the webcam
while True:
    # Read a single frame from the video feed
    ret, frame = video_capture.read()

    if not ret:
        break

    # Convert the frame to grayscale (Haar cascades work better on grayscale images)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Detect faces in the grayscale image
    # detectMultiScale returns a list of rectangles (x, y, width, height)
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )

    # Draw a rectangle around each detected face
    for (x, y, w, h) in faces:
        # We draw the rectangle on the original color frame
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

    # Display the resulting frame in a window
    cv2.imshow('Video', frame)

    # Exit the loop if the 'q' key is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# When everything is done, release the capture and close all windows
video_capture.release()
cv2.destroyAllWindows()