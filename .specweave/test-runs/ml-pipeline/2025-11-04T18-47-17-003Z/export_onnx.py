
from ultralytics import YOLO

# Load trained model
model = YOLO('/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline/2025-11-04T18-47-17-003Z/runs/train/weights/best.pt')

# Export to ONNX
onnx_path = model.export(format='onnx', simplify=True)
print(f"ONNX model exported to: {onnx_path}")
