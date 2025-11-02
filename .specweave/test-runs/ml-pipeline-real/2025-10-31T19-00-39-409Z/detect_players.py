
from ultralytics import YOLO
import cv2
import os
import glob
import json

# Load pretrained YOLOv8 model (COCO dataset - includes 'person' class)
model = YOLO('yolov8n.pt')  # Nano model for speed

frames_dir = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T19-00-39-409Z/frames"
output_dir = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T19-00-39-409Z/detections_visualized"

# Get all frame files
frame_files = sorted(glob.glob(os.path.join(frames_dir, 'frame_*.jpg')))

detections_data = []
total_detections = 0

print(f"🔍 Processing {len(frame_files)} frames...")

for i, frame_path in enumerate(frame_files):
    frame = cv2.imread(frame_path)

    # Run YOLO detection
    results = model(frame, conf=0.4, verbose=False)

    # Filter for 'person' class (class 0 in COCO)
    # COCO classes: 0=person, 32=sports ball, etc.
    boxes = results[0].boxes

    frame_detections = {
        'frame': os.path.basename(frame_path),
        'players': [],
        'ball': []
    }

    if boxes is not None:
        for box in boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

            # Class 0 = person (player)
            if class_id == 0:
                frame_detections['players'].append({
                    'bbox': bbox,
                    'confidence': confidence
                })
                total_detections += 1

            # Class 32 = sports ball (optional)
            elif class_id == 32:
                frame_detections['ball'].append({
                    'bbox': bbox,
                    'confidence': confidence
                })

    detections_data.append(frame_detections)

    if (i + 1) % 5 == 0:
        print(f"   Processed {i + 1}/{len(frame_files)} frames... ({total_detections} players detected so far)")

# Save detections data
detections_file = os.path.join(output_dir, 'detections.json')
with open(detections_file, 'w') as f:
    json.dump(detections_data, f, indent=2)

print(f"✅ Detection complete:")
print(f"   - Total players detected: {total_detections}")
print(f"   - Avg players per frame: {total_detections / len(frame_files):.1f}")
print(f"   - Detections saved to: {detections_file}")
