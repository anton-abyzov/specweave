
from ultralytics import YOLO
import json

# Load trained model
model = YOLO('/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline/2025-11-04T18-26-22-092Z/runs/train/weights/best.pt')

# Run validation
results = model.val(
    data='/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline/2025-11-04T18-26-22-092Z/dataset/dataset.yaml',
    verbose=False
)

# Extract metrics
metrics = {
    'mAP50': float(results.box.map50),
    'mAP50-95': float(results.box.map),
    'precision': float(results.box.mp),
    'recall': float(results.box.mr)
}

print(json.dumps(metrics, indent=2))
