# ML Platform Overview

## Data Pipeline Conventions

All data ingestion follows a standardized pipeline pattern: Extract → Validate → Transform → Load (EVTL). Each stage is implemented as a separate Python module with a common `PipelineStage` base class.

Pandas DataFrames are the primary data interchange format between pipeline stages. Validation uses Pandera schemas to enforce column types, value ranges, and nullability constraints before any transformation.

NumPy arrays are used for numerical computations within feature engineering steps. The `FeatureStore` abstraction provides versioned feature sets backed by Parquet files on S3.

Data quality checks run automatically after each pipeline stage. Failing checks halt the pipeline and send alerts via PagerDuty. Historical quality metrics are tracked in a Grafana dashboard.

## Conventions

- All pipeline configs live in `configs/pipelines/*.yaml`
- Feature definitions are registered in `feature_registry.py`
- Data contracts are versioned and stored alongside schemas
