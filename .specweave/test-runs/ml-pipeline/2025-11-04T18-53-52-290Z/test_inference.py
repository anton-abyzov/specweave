
from ultralytics import YOLO
import glob
import time
import json

# Load trained model
model = YOLO('/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline/2025-11-04T18-53-52-290Z/runs/train/weights/best.pt')

# Get validation images
val_images = glob.glob('/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline/2025-11-04T18-53-52-290Z/dataset/images/val/*.jpg')

# Run inference
results_data = []
for img_path in val_images[:2]:  # Test on 2 images
    start_time = time.time()
    results = model(img_path, verbose=False)
    inference_time = (time.time() - start_time) * 1000  # ms

    # Get detections
    boxes = results[0].boxes
    detections = len(boxes) if boxes is not None else 0

    results_data.append({
        'image': img_path.split('/')[-1],
        'inference_time_ms': round(inference_time, 2),
        'detections': detections
    })

print(json.dumps(results_data, indent=2))
