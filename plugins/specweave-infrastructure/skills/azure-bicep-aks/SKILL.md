---
description: Azure Bicep and AKS expert for infrastructure-as-code deployments, Kubernetes cluster management, networking, identity, monitoring, and Container Apps. Generates modular Bicep templates with environment-specific parameter files.
allowed-tools: Read, Write, Edit, Bash
model: opus
context: fork
---

# Azure Bicep & AKS Expert

## Purpose

Design and implement Azure infrastructure using Bicep templates with a focus on AKS cluster management, Container Apps, networking, identity, and operational excellence. Produces modular, reusable Bicep code following Azure Well-Architected Framework principles.

## When to Use

- Writing Bicep templates for Azure resource deployments
- Creating or managing AKS clusters
- Designing Azure networking (VNet, NSG, Application Gateway)
- Implementing Managed Identity and Workload Identity
- Setting up monitoring with Azure Monitor and Container Insights
- Choosing between AKS and Azure Container Apps
- Building CI/CD pipelines with Azure DevOps or GitHub Actions for Azure

## Bicep Language

### Resource Declarations

```bicep
// Parameters with decorators
@description('The Azure region for all resources')
param location string = resourceGroup().location

@allowed(['dev', 'staging', 'production'])
param environment string

@minLength(3)
@maxLength(24)
param storageAccountName string

@secure()
param adminPassword string

// Variables
var prefix = 'myapp-${environment}'
var tags = {
  Environment: environment
  ManagedBy: 'Bicep'
  Project: 'MyApp'
}

// Resource declaration
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: environment == 'production' ? 'Standard_GRS' : 'Standard_LRS'
  }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

// Outputs
output storageId string = storageAccount.id
output storageName string = storageAccount.name
```

### Conditions and Loops

```bicep
// Conditional deployment
param deployRedis bool = false

resource redis 'Microsoft.Cache/redis@2023-08-01' = if (deployRedis) {
  name: '${prefix}-redis'
  location: location
  properties: {
    sku: {
      name: environment == 'production' ? 'Premium' : 'Basic'
      family: environment == 'production' ? 'P' : 'C'
      capacity: environment == 'production' ? 1 : 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// Loop over array
param appServices array = [
  { name: 'api', sku: 'P1v3' }
  { name: 'web', sku: 'P1v3' }
  { name: 'worker', sku: 'B1' }
]

resource appServicePlans 'Microsoft.Web/serverfarms@2023-12-01' = [
  for app in appServices: {
    name: '${prefix}-${app.name}-plan'
    location: location
    tags: tags
    sku: {
      name: app.sku
    }
    kind: 'linux'
    properties: {
      reserved: true
    }
  }
]

// Loop with index
resource nsgRules 'Microsoft.Network/networkSecurityGroups/securityRules@2023-11-01' = [
  for (rule, i) in allowedPorts: {
    name: 'Allow-${rule.name}'
    parent: nsg
    properties: {
      priority: 100 + (i * 10)
      direction: 'Inbound'
      access: 'Allow'
      protocol: 'Tcp'
      sourceAddressPrefix: rule.source
      destinationPortRange: string(rule.port)
      sourcePortRange: '*'
      destinationAddressPrefix: '*'
    }
  }
]
```

### User-Defined Types and Functions

```bicep
// User-defined type
@export()
type environmentConfig = {
  name: 'dev' | 'staging' | 'production'
  skuTier: 'Basic' | 'Standard' | 'Premium'
  instanceCount: int
  enableHA: bool
}

// Using the type
param config environmentConfig = {
  name: 'production'
  skuTier: 'Premium'
  instanceCount: 3
  enableHA: true
}

// User-defined function
@export()
func getSubnetId(vnetId string, subnetName string) string =>
  '${vnetId}/subnets/${subnetName}'

// Discriminated union type
@export()
type storageConfig = {
  kind: 'blob'
  containerName: string
} | {
  kind: 'table'
  tableName: string
}
```

### Module Composition

```bicep
// main.bicep - orchestrator
targetScope = 'subscription'

param location string = 'eastus2'
param environment string

// Resource group
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-myapp-${environment}'
  location: location
}

// Network module
module network 'modules/network.bicep' = {
  name: 'network-deployment'
  scope: rg
  params: {
    location: location
    environment: environment
    vnetAddressPrefix: '10.0.0.0/16'
  }
}

// AKS module (depends on network)
module aks 'modules/aks.bicep' = {
  name: 'aks-deployment'
  scope: rg
  params: {
    location: location
    environment: environment
    subnetId: network.outputs.aksSubnetId
    logAnalyticsWorkspaceId: monitoring.outputs.workspaceId
  }
}

// Monitoring module
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring-deployment'
  scope: rg
  params: {
    location: location
    environment: environment
  }
}
```

### Scope Targeting

```bicep
// Subscription-level deployment
targetScope = 'subscription'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-platform'
  location: 'eastus2'
}

// Management group deployment
targetScope = 'managementGroup'

resource policy 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'require-tags'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    policyRule: {
      if: {
        field: 'tags.Environment'
        exists: 'false'
      }
      then: {
        effect: 'deny'
      }
    }
  }
}
```

### What-If Deployment Preview

```bash
# Preview changes before deploying
az deployment group what-if \
  --resource-group rg-myapp-production \
  --template-file main.bicep \
  --parameters @parameters/production.bicepparam

# Subscription-level what-if
az deployment sub what-if \
  --location eastus2 \
  --template-file main.bicep \
  --parameters environment=production
```

## AKS (Azure Kubernetes Service)

### Cluster Creation with Bicep

```bicep
// modules/aks.bicep
param location string
param environment string
param subnetId string
param logAnalyticsWorkspaceId string

var clusterName = 'aks-myapp-${environment}'

// Managed Identity for AKS
resource aksIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${clusterName}-identity'
  location: location
}

// AKS Cluster
resource aksCluster 'Microsoft.ContainerService/managedClusters@2024-02-01' = {
  name: clusterName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${aksIdentity.id}': {}
    }
  }
  sku: {
    name: 'Base'
    tier: environment == 'production' ? 'Standard' : 'Free'
  }
  properties: {
    dnsPrefix: clusterName
    kubernetesVersion: '1.30'
    networkProfile: {
      networkPlugin: 'azure'
      networkPluginMode: 'overlay'
      networkPolicy: 'calico'
      serviceCidr: '10.1.0.0/16'
      dnsServiceIP: '10.1.0.10'
      loadBalancerSku: 'standard'
    }

    // System node pool (required)
    agentPoolProfiles: [
      {
        name: 'system'
        count: environment == 'production' ? 3 : 1
        vmSize: 'Standard_D4s_v5'
        mode: 'System'
        osType: 'Linux'
        osSKU: 'AzureLinux'
        vnetSubnetID: subnetId
        enableAutoScaling: true
        minCount: environment == 'production' ? 3 : 1
        maxCount: environment == 'production' ? 5 : 3
        availabilityZones: environment == 'production' ? ['1', '2', '3'] : []
        nodeTaints: ['CriticalAddonsOnly=true:NoSchedule']
      }
    ]

    // Azure AD integration
    aadProfile: {
      managed: true
      enableAzureRBAC: true
    }

    // Monitoring
    addonProfiles: {
      omsagent: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: logAnalyticsWorkspaceId
        }
      }
      azureKeyvaultSecretsProvider: {
        enabled: true
        config: {
          enableSecretRotation: 'true'
          rotationPollInterval: '120s'
        }
      }
    }

    // Security
    enableRBAC: true
    disableLocalAccounts: true
    securityProfile: {
      defender: {
        securityMonitoring: {
          enabled: environment == 'production'
        }
      }
      workloadIdentity: {
        enabled: true
      }
    }
    oidcIssuerProfile: {
      enabled: true
    }

    autoUpgradeProfile: {
      upgradeChannel: 'stable'
      nodeOSUpgradeChannel: 'NodeImage'
    }
  }
}

// User node pool (workloads)
resource userPool 'Microsoft.ContainerService/managedClusters/agentPools@2024-02-01' = {
  parent: aksCluster
  name: 'workload'
  properties: {
    mode: 'User'
    vmSize: 'Standard_D8s_v5'
    osType: 'Linux'
    osSKU: 'AzureLinux'
    vnetSubnetID: subnetId
    enableAutoScaling: true
    minCount: 2
    maxCount: 20
    availabilityZones: environment == 'production' ? ['1', '2', '3'] : []
    nodeLabels: {
      'workload-type': 'general'
    }
  }
}

// Spot instance pool (cost optimization)
resource spotPool 'Microsoft.ContainerService/managedClusters/agentPools@2024-02-01' = if (environment != 'production') {
  parent: aksCluster
  name: 'spot'
  properties: {
    mode: 'User'
    vmSize: 'Standard_D4s_v5'
    osType: 'Linux'
    scaleSetPriority: 'Spot'
    spotMaxPrice: -1  // Pay up to on-demand price
    scaleSetEvictionPolicy: 'Delete'
    enableAutoScaling: true
    minCount: 0
    maxCount: 10
    nodeTaints: ['kubernetes.azure.com/scalesetpriority=spot:NoSchedule']
    nodeLabels: {
      'kubernetes.azure.com/scalesetpriority': 'spot'
    }
  }
}

output clusterName string = aksCluster.name
output clusterFqdn string = aksCluster.properties.fqdn
output oidcIssuerUrl string = aksCluster.properties.oidcIssuerProfile.issuerURL
```

### Workload Identity Setup

```bicep
// Create a user-assigned managed identity for the workload
resource appIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-myapp-${environment}'
  location: location
}

// Federated credential for Kubernetes service account
resource federatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: appIdentity
  name: 'myapp-federated'
  properties: {
    issuer: aksCluster.properties.oidcIssuerProfile.issuerURL
    subject: 'system:serviceaccount:production:myapp-sa'
    audiences: ['api://AzureADTokenExchange']
  }
}
```

```yaml
# Kubernetes ServiceAccount with Workload Identity annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<managed-identity-client-id>"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: myapp
          image: myacr.azurecr.io/myapp:latest
```

### Networking: Azure CNI Overlay

```bicep
// modules/network.bicep
param location string
param environment string
param vnetAddressPrefix string

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: 'vnet-myapp-${environment}'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [vnetAddressPrefix]
    }
    subnets: [
      {
        name: 'snet-aks'
        properties: {
          addressPrefix: cidrSubnet(vnetAddressPrefix, 20, 0)  // /20 for AKS nodes
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
      {
        name: 'snet-appgw'
        properties: {
          addressPrefix: cidrSubnet(vnetAddressPrefix, 24, 16)  // /24 for App Gateway
        }
      }
      {
        name: 'snet-private-endpoints'
        properties: {
          addressPrefix: cidrSubnet(vnetAddressPrefix, 24, 17)
          privateEndpointNetworkPolicies: 'Enabled'
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output aksSubnetId string = vnet.properties.subnets[0].id
output appGwSubnetId string = vnet.properties.subnets[1].id
```

### Ingress: Application Gateway Ingress Controller (AGIC)

```bicep
resource appGateway 'Microsoft.Network/applicationGateways@2023-11-01' = {
  name: 'agw-myapp-${environment}'
  location: location
  properties: {
    sku: {
      name: 'WAF_v2'
      tier: 'WAF_v2'
    }
    autoscaleConfiguration: {
      minCapacity: 1
      maxCapacity: environment == 'production' ? 10 : 2
    }
    webApplicationFirewallConfiguration: {
      enabled: true
      firewallMode: 'Prevention'
      ruleSetType: 'OWASP'
      ruleSetVersion: '3.2'
    }
    gatewayIPConfigurations: [
      {
        name: 'appGatewayIpConfig'
        properties: {
          subnet: { id: appGwSubnetId }
        }
      }
    ]
    // Frontend, backend, routing configured by AGIC controller
  }
}
```

### Monitoring: Container Insights + Prometheus

```bicep
// modules/monitoring.bicep
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-myapp-${environment}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: environment == 'production' ? 90 : 30
  }
}

resource prometheusWorkspace 'Microsoft.Monitor/accounts@2023-04-03' = {
  name: 'prometheus-myapp-${environment}'
  location: location
}

resource grafanaDashboard 'Microsoft.Dashboard/grafana@2023-09-01' = {
  name: 'grafana-myapp-${environment}'
  location: location
  sku: { name: 'Standard' }
  identity: { type: 'SystemAssigned' }
  properties: {
    grafanaIntegrations: {
      azureMonitorWorkspaceIntegrations: [
        { azureMonitorWorkspaceResourceId: prometheusWorkspace.id }
      ]
    }
  }
}

output workspaceId string = logAnalytics.id
```

## AKS vs Container Apps Decision Framework

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│ Criteria             │ AKS                  │ Container Apps       │
├──────────────────────┼──────────────────────┼──────────────────────┤
│ K8s expertise needed │ Yes                  │ No                   │
│ Custom controllers   │ Full control         │ Not supported        │
│ GPU workloads        │ Supported            │ Limited              │
│ Scale to zero        │ With KEDA            │ Built-in             │
│ Service mesh         │ Istio/Linkerd/custom │ Built-in Dapr        │
│ Pricing model        │ Pay for nodes        │ Pay per request      │
│ Microservices <10    │ Overkill             │ Ideal                │
│ Microservices 10+    │ Ideal                │ Gets complex         │
│ Compliance (PCI/SOC) │ Full control         │ Shared responsibility│
│ Stateful workloads   │ Full support         │ Limited              │
│ Startup time         │ Days to configure    │ Hours                │
└──────────────────────┴──────────────────────┴──────────────────────┘

RULE OF THUMB:
- < 10 microservices, no K8s expertise → Container Apps
- Complex orchestration, custom operators → AKS
- Event-driven, scale-to-zero critical → Container Apps
- Strict compliance, full network control → AKS
```

## Azure Container Apps

```bicep
// Container Apps Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-myapp-${environment}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    zoneRedundant: environment == 'production'
    workloadProfiles: [
      { name: 'Consumption', workloadProfileType: 'Consumption' }
      {
        name: 'Dedicated-D4'
        workloadProfileType: 'D4'
        minimumCount: 1
        maximumCount: 5
      }
    ]
  }
}

// Container App with Dapr and scaling rules
resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-api-${environment}'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http2'
        corsPolicy: {
          allowedOrigins: ['https://myapp.com']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
        }
      }
      dapr: {
        enabled: true
        appId: 'api'
        appPort: 8080
        appProtocol: 'http'
      }
      secrets: [
        {
          name: 'db-connection'
          keyVaultUrl: 'https://kv-myapp.vault.azure.net/secrets/db-connection'
          identity: appIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: 'myacr.azurecr.io/api:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'DB_CONNECTION', secretRef: 'db-connection' }
          ]
        }
      ]
      scale: {
        minReplicas: environment == 'production' ? 2 : 0
        maxReplicas: 20
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '50' } }
          }
          {
            name: 'queue-scaling'
            custom: {
              type: 'azure-servicebus'
              metadata: {
                queueName: 'orders'
                messageCount: '10'
              }
              auth: [
                { secretRef: 'sb-connection', triggerParameter: 'connection' }
              ]
            }
          }
        ]
      }
    }
  }
}
```

## Bicep Deployment Patterns

### Parameter Files (.bicepparam)

```bicep
// parameters/production.bicepparam
using '../main.bicep'

param environment = 'production'
param location = 'eastus2'
param deployRedis = true
param appServices = [
  { name: 'api', sku: 'P2v3' }
  { name: 'web', sku: 'P1v3' }
  { name: 'worker', sku: 'P1v3' }
]
```

### CI/CD with GitHub Actions

```yaml
name: Deploy Infrastructure
on:
  push:
    branches: [main]
    paths: ['infra/**']

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: What-If Preview
        uses: azure/arm-deploy@v2
        with:
          scope: subscription
          region: eastus2
          template: infra/main.bicep
          parameters: infra/parameters/production.bicepparam
          additionalArguments: --what-if

      - name: Deploy
        uses: azure/arm-deploy@v2
        with:
          scope: subscription
          region: eastus2
          template: infra/main.bicep
          parameters: infra/parameters/production.bicepparam
```

## Common Azure Resources Reference

### SQL Database

```bicep
resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: 'sql-myapp-${environment}'
  location: location
  properties: {
    administratorLogin: 'sqladmin'
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: 'db-myapp'
  location: location
  sku: {
    name: environment == 'production' ? 'P2' : 'S1'
    tier: environment == 'production' ? 'Premium' : 'Standard'
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 268435456000  // 250 GB
    zoneRedundant: environment == 'production'
  }
}
```

### Cosmos DB

```bicep
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {
  name: 'cosmos-myapp-${environment}'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      { locationName: location, failoverPriority: 0, isZoneRedundant: true }
    ]
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: true
    enableMultipleWriteLocations: false
    publicNetworkAccess: 'Disabled'
    networkAclBypass: 'AzureServices'
    capacity: {
      totalThroughputLimit: environment == 'production' ? 10000 : 1000
    }
  }
}
```
