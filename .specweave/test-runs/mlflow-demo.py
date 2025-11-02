#!/usr/bin/env python3
"""
MLflow Demo - Soccer Player Detection Model Training
Shows how MLflow tracks experiments with real data
"""

import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import numpy as np
import time

print("=" * 70)
print("MLflow Demo: Training Soccer Player Detection Models")
print("=" * 70)
print()

# Set experiment name
mlflow.set_experiment("soccer-player-detection")

# Generate synthetic training data (simulating player detection features)
print("📊 Generating training data...")
print("   Simulating 1000 player detections with features:")
print("   - Bounding box size, position, confidence, motion, etc.")
print()

np.random.seed(42)
n_samples = 1000

# Features: bbox_width, bbox_height, confidence, x_position, y_position, motion_speed
X = np.random.randn(n_samples, 6)
# Labels: 1 = actual player, 0 = false positive
y = (X[:, 2] > 0).astype(int)  # High confidence = likely real player

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"✅ Training set: {len(X_train)} samples")
print(f"✅ Test set: {len(X_test)} samples")
print()

# Experiment 1: Small model (fast, less accurate)
print("🔬 Experiment 1: Small Model (n_estimators=10)")
print("-" * 70)

with mlflow.start_run(run_name="small_model_fast"):
    # Log parameters
    n_estimators = 10
    max_depth = 5

    mlflow.log_param("model_type", "RandomForest")
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("dataset_size", len(X_train))

    # Train model
    start_time = time.time()
    model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
    model.fit(X_train, y_train)
    training_time = time.time() - start_time

    # Make predictions
    y_pred = model.predict(X_test)

    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("precision", precision)
    mlflow.log_metric("recall", recall)
    mlflow.log_metric("f1_score", f1)
    mlflow.log_metric("training_time_seconds", training_time)

    # Log model
    mlflow.sklearn.log_model(model, "player_detector_small")

    print(f"   Training time: {training_time:.3f}s")
    print(f"   Accuracy: {accuracy:.3f}")
    print(f"   Precision: {precision:.3f}")
    print(f"   Recall: {recall:.3f}")
    print(f"   F1 Score: {f1:.3f}")
    print(f"   ✅ Logged to MLflow")
    print()

# Experiment 2: Medium model (balanced)
print("🔬 Experiment 2: Medium Model (n_estimators=50)")
print("-" * 70)

with mlflow.start_run(run_name="medium_model_balanced"):
    # Log parameters
    n_estimators = 50
    max_depth = 10

    mlflow.log_param("model_type", "RandomForest")
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("dataset_size", len(X_train))

    # Train model
    start_time = time.time()
    model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
    model.fit(X_train, y_train)
    training_time = time.time() - start_time

    # Make predictions
    y_pred = model.predict(X_test)

    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("precision", precision)
    mlflow.log_metric("recall", recall)
    mlflow.log_metric("f1_score", f1)
    mlflow.log_metric("training_time_seconds", training_time)

    # Log model
    mlflow.sklearn.log_model(model, "player_detector_medium")

    # Tag as production candidate
    mlflow.set_tag("stage", "production_candidate")
    mlflow.set_tag("owner", "ml_team")

    print(f"   Training time: {training_time:.3f}s")
    print(f"   Accuracy: {accuracy:.3f}")
    print(f"   Precision: {precision:.3f}")
    print(f"   Recall: {recall:.3f}")
    print(f"   F1 Score: {f1:.3f}")
    print(f"   🏆 Tagged as production candidate")
    print(f"   ✅ Logged to MLflow")
    print()

# Experiment 3: Large model (slow, more accurate)
print("🔬 Experiment 3: Large Model (n_estimators=100)")
print("-" * 70)

with mlflow.start_run(run_name="large_model_accurate"):
    # Log parameters
    n_estimators = 100
    max_depth = 20

    mlflow.log_param("model_type", "RandomForest")
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("dataset_size", len(X_train))

    # Train model
    start_time = time.time()
    model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
    model.fit(X_train, y_train)
    training_time = time.time() - start_time

    # Make predictions
    y_pred = model.predict(X_test)

    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("precision", precision)
    mlflow.log_metric("recall", recall)
    mlflow.log_metric("f1_score", f1)
    mlflow.log_metric("training_time_seconds", training_time)

    # Log model
    mlflow.sklearn.log_model(model, "player_detector_large")

    print(f"   Training time: {training_time:.3f}s")
    print(f"   Accuracy: {accuracy:.3f}")
    print(f"   Precision: {precision:.3f}")
    print(f"   Recall: {recall:.3f}")
    print(f"   F1 Score: {f1:.3f}")
    print(f"   ✅ Logged to MLflow")
    print()

# Experiment 4: Overfitting example (too deep)
print("🔬 Experiment 4: Overfitting Model (max_depth=None)")
print("-" * 70)

with mlflow.start_run(run_name="overfitting_model_deep"):
    # Log parameters
    n_estimators = 50
    max_depth = None  # No limit!

    mlflow.log_param("model_type", "RandomForest")
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", str(max_depth))
    mlflow.log_param("dataset_size", len(X_train))

    # Train model
    start_time = time.time()
    model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
    model.fit(X_train, y_train)
    training_time = time.time() - start_time

    # Make predictions
    y_pred = model.predict(X_test)

    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("precision", precision)
    mlflow.log_metric("recall", recall)
    mlflow.log_metric("f1_score", f1)
    mlflow.log_metric("training_time_seconds", training_time)

    # Log model
    mlflow.sklearn.log_model(model, "player_detector_overfit")

    # Tag as problematic
    mlflow.set_tag("stage", "experimental")
    mlflow.set_tag("warning", "potential_overfitting")

    print(f"   Training time: {training_time:.3f}s")
    print(f"   Accuracy: {accuracy:.3f}")
    print(f"   Precision: {precision:.3f}")
    print(f"   Recall: {recall:.3f}")
    print(f"   F1 Score: {f1:.3f}")
    print(f"   ⚠️  Tagged as experimental (overfitting risk)")
    print(f"   ✅ Logged to MLflow")
    print()

print("=" * 70)
print("✅ All experiments logged to MLflow!")
print("=" * 70)
print()
print("📊 View results in MLflow UI:")
print("   1. Run: mlflow ui")
print("   2. Open: http://localhost:5000")
print("   3. Navigate to 'soccer-player-detection' experiment")
print()
print("🔍 What you'll see:")
print("   - 4 different training runs")
print("   - Parameters (n_estimators, max_depth)")
print("   - Metrics (accuracy, precision, recall, F1)")
print("   - Training time comparison")
print("   - Downloadable trained models")
print()
