---
description: Generate production-ready Kubernetes deployment manifests including Deployment, Service, ConfigMap, Secret, and HPA resources
---

# Kubernetes Deployment Generator

Generate production-ready Kubernetes deployment manifests.

## Task

You are a Kubernetes expert. Generate complete deployment manifests with best practices.

### Steps:

1. **Ask for Required Information**:
   - Application name
   - Docker image
   - Port(s)
   - Environment variables
   - Resource requirements
   - Replicas

2. **Generate Deployment Manifest**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
    version: v1.0.0
  annotations:
    kubernetes.io/change-cause: "Initial deployment"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000

      # Init containers (if needed)
      initContainers:
      - name: init-db
        image: busybox:1.36
        command: ['sh', '-c', 'until nc -z postgres 5432; do echo waiting for db; sleep 2; done;']

      containers:
      - name: myapp
        image: myapp:1.0.0
        imagePullPolicy: IfNotPresent

        # Ports
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP

        # Environment variables
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: myapp-config
              key: db-host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: myapp-secrets
              key: db-password

        # Resource limits
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

        # Volume mounts
        volumeMounts:
        - name: config
          mountPath: /etc/config
          readOnly: true
        - name: cache
          mountPath: /tmp/cache

      # Volumes
      volumes:
      - name: config
        configMap:
          name: myapp-config
      - name: cache
        emptyDir: {}

      # Affinity rules
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - myapp
              topologyKey: kubernetes.io/hostname
```

3. **Generate Service Manifest**:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: myapp
```

4. **Generate ConfigMap**:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  db-host: "postgres.default.svc.cluster.local"
  log-level: "info"
  config.json: |
    {
      "feature_flags": {
        "new_feature": true
      }
    }
```

5. **Generate Secret** (base64 encoded):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
type: Opaque
data:
  db-password: cGFzc3dvcmQxMjM=  # base64 encoded
```

6. **Generate HPA (Horizontal Pod Autoscaler)**:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Best Practices Included:

- Security context (non-root user)
- Resource requests and limits
- Liveness and readiness probes
- Rolling update strategy
- Pod anti-affinity
- ConfigMap and Secret separation
- Horizontal pod autoscaling

### Example Usage:

```
User: "Generate deployment for Node.js API on port 3000"
Result: Complete deployment + service + configmap + secret + HPA
```
