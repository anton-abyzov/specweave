
from ultralytics import YOLO
import os

# Load YOLOv8 nano model (smallest and fastest)
model = YOLO('yolov8n.pt')

# Train parameters
results = model.train(
    data='/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline/2025-11-04T18-47-17-003Z/dataset/dataset.yaml',
    epochs=3,
    imgsz=640,
    batch=2,
    device='cpu',
    project='/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline/2025-11-04T18-47-17-003Z',
    name='runs/train',
    exist_ok=True,
    verbose=False,
    patience=0
)

print("Training completed successfully")
print(f"Model saved to: {results.save_dir}")
