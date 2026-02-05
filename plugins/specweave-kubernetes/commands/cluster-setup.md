---
description: Set up a production-ready Kubernetes cluster with essential components including ingress, cert-manager, monitoring, and GitOps
---

# Kubernetes Cluster Setup

Set up a production-ready Kubernetes cluster with essential components.

## Task

You are a Kubernetes infrastructure expert. Guide users through setting up a production cluster.

### Steps:

1. **Ask for Platform**:
   - Managed (EKS, GKE, AKS)
   - Self-hosted (kubeadm, k3s, kind)
   - Local dev (minikube, kind, k3d)

2. **Generate Cluster Configuration**:

#### EKS (AWS):

```bash
# eksctl config
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: production-cluster
  region: us-east-1
  version: "1.28"

managedNodeGroups:
  - name: general-purpose
    instanceType: t3.medium
    minSize: 3
    maxSize: 10
    desiredCapacity: 3
    volumeSize: 50
    ssh:
      allow: true
    labels:
      workload-type: general
    tags:
      nodegroup-role: general-purpose
    iam:
      withAddonPolicies:
        autoScaler: true
        certManager: true
        externalDNS: true
        ebs: true
        efs: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver
```

#### GKE (Google Cloud):

```bash
gcloud container clusters create production-cluster \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --disk-size 50 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --maintenance-window-start "2024-01-01T00:00:00Z" \
  --maintenance-window-duration 4h \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
  --workload-pool=production-cluster.svc.id.goog \
  --enable-shielded-nodes \
  --enable-ip-alias \
  --network default \
  --subnetwork default \
  --cluster-version latest
```

#### AKS (Azure):

```bash
az aks create \
  --resource-group production-rg \
  --name production-cluster \
  --location eastus \
  --kubernetes-version 1.28.0 \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --network-plugin azure \
  --enable-managed-identity \
  --enable-pod-security-policy \
  --enable-addons monitoring,azure-policy \
  --generate-ssh-keys
```

3. **Install Essential Add-ons**:

#### Ingress Controller (NGINX):

```yaml
# Helm install
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=3 \
  --set controller.service.type=LoadBalancer \
  --set controller.metrics.enabled=true
```

#### Cert-Manager (TLS certificates):

```yaml
helm repo add jetstack https://charts.jetstack.io
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# ClusterIssuer for Let's Encrypt
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

#### Prometheus + Grafana (Monitoring):

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --set grafana.adminPassword=admin123
```

#### External DNS (auto DNS records):

```yaml
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm upgrade --install external-dns external-dns/external-dns \
  --namespace kube-system \
  --set provider=aws \  # or google, azure
  --set txtOwnerId=production-cluster \
  --set policy=sync
```

#### ArgoCD (GitOps):

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

4. **Security Setup**:

#### Network Policies:

```yaml
# Default deny all
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

# Allow DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

#### Pod Security Standards:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

5. **Storage Classes**:

```yaml
# Fast SSD storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: ebs.csi.aws.com  # or pd.csi.storage.gke.io, disk.csi.azure.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

### Best Practices Included:

- Multi-AZ/region deployment
- Auto-scaling (cluster and pods)
- Monitoring and logging
- TLS certificate automation
- GitOps with ArgoCD
- Network policies
- Resource quotas
- RBAC configuration

### Example Usage:

```
User: "Set up production EKS cluster with monitoring"
Result: Complete EKS config + all essential add-ons
```
