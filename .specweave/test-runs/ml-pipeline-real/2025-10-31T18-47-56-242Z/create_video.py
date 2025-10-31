
import cv2
import os
import glob

detections_dir = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T18-47-56-242Z/detections_visualized"
output_video = os.path.join("/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T18-47-56-242Z", 'detections_output.mp4')

# Get all visualized frames
frame_files = sorted(glob.glob(os.path.join(detections_dir, 'frame_*.jpg')))

if len(frame_files) == 0:
    raise Exception("No frames found")

# Read first frame to get dimensions
first_frame = cv2.imread(frame_files[0])
height, width = first_frame.shape[:2]

# Create video writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
fps = 1  # 1 fps since we extracted 1 frame per second
out = cv2.VideoWriter(output_video, fourcc, fps, (width, height))

for frame_file in frame_files:
    frame = cv2.imread(frame_file)
    out.write(frame)

out.release()
print(f"✅ Video created: {output_video}")
