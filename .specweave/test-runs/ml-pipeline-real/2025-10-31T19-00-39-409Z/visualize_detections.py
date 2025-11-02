
import cv2
import json
import os

frames_dir = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T19-00-39-409Z/frames"
output_dir = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T19-00-39-409Z/detections_visualized"
detections_file = os.path.join(output_dir, 'detections.json')

# Load detections
with open(detections_file, 'r') as f:
    detections_data = json.load(f)

for frame_data in detections_data:
    frame_name = frame_data['frame']
    frame_path = os.path.join(frames_dir, frame_name)
    frame = cv2.imread(frame_path)

    # Draw bounding boxes for players
    for player in frame_data['players']:
        bbox = player['bbox']
        conf = player['confidence']
        x1, y1, x2, y2 = map(int, bbox)

        # Green box for players
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Confidence label
        label = f'Player {conf:.2f}'
        cv2.putText(frame, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Draw bounding boxes for ball (if detected)
    for ball in frame_data['ball']:
        bbox = ball['bbox']
        conf = ball['confidence']
        x1, y1, x2, y2 = map(int, bbox)

        # Red box for ball
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

        label = f'Ball {conf:.2f}'
        cv2.putText(frame, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

    # Save visualized frame
    output_path = os.path.join(output_dir, frame_name)
    cv2.imwrite(output_path, frame)

print(f"✅ Visualized {len(detections_data)} frames")
print(f"   Saved to: {output_dir}")
