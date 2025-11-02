
import cv2
import os

video_path = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T18-55-11-257Z/videos/soccer_video.mp4"
output_dir = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T18-55-11-257Z/frames"

cap = cv2.VideoCapture(video_path)
fps = int(cap.get(cv2.CAP_PROP_FPS))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames / fps if fps > 0 else 0

print(f"📊 Video info:")
print(f"   - FPS: {fps}")
print(f"   - Total frames: {total_frames}")
print(f"   - Duration: {duration:.2f}s")

# Extract 1 frame per second for first 30 seconds (or less if video is shorter)
max_seconds = min(30, int(duration))
frame_count = 0

for second in range(max_seconds):
    frame_number = second * fps
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()

    if ret:
        output_path = os.path.join(output_dir, f'frame_{second:03d}.jpg')
        cv2.imwrite(output_path, frame)
        frame_count += 1
        if frame_count % 5 == 0:
            print(f"   Extracted {frame_count}/{max_seconds} frames...")

cap.release()
print(f"✅ Extracted {frame_count} frames")
