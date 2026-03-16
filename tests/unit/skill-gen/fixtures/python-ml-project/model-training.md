# Model Training Workflow

## Training Pipeline

Model training follows a reproducible workflow managed by MLflow:

1. **Data preparation** — Pull features from the FeatureStore, split into train/val/test sets using stratified sampling. Data versioning via DVC ensures reproducibility.

2. **Hyperparameter tuning** — Optuna manages the search space with TPE sampling. Each trial logs params, metrics, and artifacts to MLflow. Early stopping prevents wasted compute on poorly performing configurations.

3. **Training** — PyTorch Lightning handles the training loop with automatic mixed precision (AMP) and gradient accumulation. Checkpoints are saved every epoch with the best model selected by validation loss.

4. **Evaluation** — The champion model is evaluated against a holdout set. Metrics include AUROC, precision/recall at various thresholds, and calibration curves. Results are compared against the current production model.

5. **Registry** — Approved models are promoted to the MLflow Model Registry with stage transitions (Staging → Production). A/B testing configs are generated automatically for canary deployments.

## MLflow Tracking

Every experiment logs:
- Hyperparameters (learning rate, batch size, architecture choices)
- Training metrics per epoch (loss, accuracy, custom metrics)
- Model artifacts (weights, ONNX export, inference config)
- Environment snapshot (pip freeze, CUDA version, hardware specs)

The MLflow UI is accessible at `mlflow.internal:5000` and serves as the single source of truth for all experiment history.
