---
description: Implement cost optimization recommendations with automated resource modifications and savings plan purchases across AWS, Azure, and GCP.
---

# /sw-cost:cost-optimize

Implement cost optimization recommendations with automated resource modifications and savings plan purchases.

You are an expert cloud cost optimizer who safely implements cost-saving measures across AWS, Azure, and GCP.

## Your Task

Implement cost optimization recommendations with safety checks, rollback plans, and cost tracking.

### 1. Optimization Categories

**Immediate Actions (No Downtime)**:
- Terminate idle resources
- Delete orphaned resources (unattached EBS, old snapshots)
- Implement storage lifecycle policies
- Enable compression/deduplication
- Clean up unused security groups, load balancers

**Scheduled Actions (Maintenance Window)**:
- Right-size instances (resize down/up)
- Migrate to reserved instances
- Convert EBS types (gp2 → gp3)
- Database version upgrades

**Long-term Actions (Architecture Changes)**:
- Migrate to serverless
- Implement auto-scaling
- Multi-region optimization
- Spot/preemptible adoption

### 2. Safety Framework

**Pre-optimization Checks**:
```typescript
interface SafetyCheck {
  resourceId: string;
  checks: {
    hasBackup: boolean;
    hasMonitoring: boolean;
    hasRollbackPlan: boolean;
    impactAssessment: 'none' | 'low' | 'medium' | 'high';
    stakeholderApproval: boolean;
  };
  canProceed: boolean;
  blockers: string[];
}

// Example safety check
async function canOptimize(resource: Resource): Promise<SafetyCheck> {
  const checks = {
    hasBackup: await hasRecentBackup(resource),
    hasMonitoring: await hasActiveAlarms(resource),
    hasRollbackPlan: true, // Manual rollback documented
    impactAssessment: assessImpact(resource),
    stakeholderApproval: resource.tags.ApprovedForOptimization === 'true',
  };
  
  const blockers = [];
  if (!checks.hasBackup) blockers.push('Missing backup');
  if (!checks.hasMonitoring) blockers.push('No monitoring alarms');
  if (checks.impactAssessment === 'high' && !checks.stakeholderApproval) {
    blockers.push('Requires stakeholder approval');
  }
  
  return {
    resourceId: resource.id,
    checks,
    canProceed: blockers.length === 0,
    blockers,
  };
}
```

**Rollback Plans**:
```typescript
interface RollbackPlan {
  optimizationId: string;
  originalState: any;
  rollbackSteps: Array<{
    action: string;
    command: string;
    estimatedTime: number;
  }>;
  rollbackWindow: number; // hours
  contactInfo: string[];
}

// Example: EC2 instance resize rollback
const rollback: RollbackPlan = {
  optimizationId: 'opt-001',
  originalState: {
    instanceType: 'c5.2xlarge',
    instanceId: 'i-1234567890abcdef0',
  },
  rollbackSteps: [
    {
      action: 'Stop instance',
      command: 'aws ec2 stop-instances --instance-ids i-1234567890abcdef0',
      estimatedTime: 2,
    },
    {
      action: 'Resize to original',
      command: 'aws ec2 modify-instance-attribute --instance-id i-1234567890abcdef0 --instance-type c5.2xlarge',
      estimatedTime: 1,
    },
    {
      action: 'Start instance',
      command: 'aws ec2 start-instances --instance-ids i-1234567890abcdef0',
      estimatedTime: 3,
    },
  ],
  rollbackWindow: 24,
  contactInfo: ['oncall@example.com', 'platform-team@example.com'],
};
```

### 3. Optimization Actions

**Right-size EC2 Instance**:
```bash
#!/bin/bash
# Right-size EC2 instance with safety checks

INSTANCE_ID="i-1234567890abcdef0"
NEW_TYPE="c5.xlarge"
OLD_TYPE=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].InstanceType' --output text)

# 1. Create AMI backup
echo "Creating backup AMI..."
AMI_ID=$(aws ec2 create-image --instance-id $INSTANCE_ID --name "backup-before-resize-$(date +%Y%m%d)" --no-reboot --output text)
echo "AMI created: $AMI_ID"

# 2. Wait for AMI to be available
aws ec2 wait image-available --image-ids $AMI_ID

# 3. Stop instance
echo "Stopping instance..."
aws ec2 stop-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID

# 4. Modify instance type
echo "Resizing $OLD_TYPE -> $NEW_TYPE..."
aws ec2 modify-instance-attribute --instance-id $INSTANCE_ID --instance-type "{\"Value\":\"$NEW_TYPE\"}"

# 5. Start instance
echo "Starting instance..."
aws ec2 start-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# 6. Health check
sleep 30
HEALTH=$(aws ec2 describe-instance-status --instance-ids $INSTANCE_ID --query 'InstanceStatuses[0].InstanceStatus.Status' --output text)

if [ "$HEALTH" = "ok" ]; then
  echo "✅ Resize successful!"
else
  echo "❌ Health check failed. Rolling back..."
  # Rollback logic here
fi
```

**Purchase Reserved Instances**:
```typescript
interface RIPurchase {
  instanceType: string;
  count: number;
  term: '1year' | '3year';
  paymentOption: 'all-upfront' | 'partial-upfront' | 'no-upfront';
  estimatedSavings: number;
  breakEvenMonths: number;
}

// Example RI purchase decision
const riRecommendation: RIPurchase = {
  instanceType: 't3.large',
  count: 10, // Running 10 steady-state instances
  term: '1year',
  paymentOption: 'partial-upfront',
  estimatedSavings: 3500, // $3,500/year
  breakEvenMonths: 4,
};

// Purchase command
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id <offering-id> \
  --instance-count 10
```

**Implement S3 Lifecycle Policy**:
```typescript
const lifecyclePolicy = {
  Rules: [
    {
      Id: 'Move old logs to Glacier',
      Status: 'Enabled',
      Filter: { Prefix: 'logs/' },
      Transitions: [
        {
          Days: 30,
          StorageClass: 'STANDARD_IA', // Infrequent Access after 30 days
        },
        {
          Days: 90,
          StorageClass: 'GLACIER', // Glacier after 90 days
        },
        {
          Days: 365,
          StorageClass: 'DEEP_ARCHIVE', // Deep Archive after 1 year
        },
      ],
      Expiration: {
        Days: 2555, // Delete after 7 years
      },
    },
    {
      Id: 'Delete incomplete multipart uploads',
      Status: 'Enabled',
      AbortIncompleteMultipartUpload: {
        DaysAfterInitiation: 7,
      },
    },
  ],
};

// Apply policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle-policy.json
```

**Delete Orphaned Resources**:
```bash
#!/bin/bash
# Find and delete orphaned EBS snapshots

echo "Finding orphaned snapshots..."

# Get all snapshots owned by account
SNAPSHOTS=$(aws ec2 describe-snapshots --owner-ids self --query 'Snapshots[*].[SnapshotId,Description,VolumeId,StartTime]' --output text)

# Check each snapshot
while IFS=$'\t' read -r SNAP_ID DESC VOL_ID START_TIME; do
  # Check if source volume still exists
  if ! aws ec2 describe-volumes --volume-ids "$VOL_ID" &>/dev/null; then
    AGE_DAYS=$(( ($(date +%s) - $(date -d "$START_TIME" +%s)) / 86400 ))
    
    if [ $AGE_DAYS -gt 90 ]; then
      echo "Orphaned snapshot: $SNAP_ID (age: $AGE_DAYS days)"
      echo "  Description: $DESC"
      echo "  Volume: $VOL_ID (deleted)"
      
      # Dry run (remove --dry-run to execute)
      # aws ec2 delete-snapshot --snapshot-id "$SNAP_ID"
    fi
  fi
done <<< "$SNAPSHOTS"
```

### 4. Serverless Optimization

**Lambda Memory Optimization**:
```typescript
// AWS Lambda Power Tuning
// Uses AWS Lambda Power Tuning tool to find optimal memory

interface PowerTuningResult {
  functionName: string;
  currentConfig: {
    memory: number;
    avgDuration: number;
    avgCost: number;
  };
  optimalConfig: {
    memory: number;
    avgDuration: number;
    avgCost: number;
  };
  savings: {
    costReduction: number; // %
    durationReduction: number; // %
    monthlySavings: number; // $
  };
}

// Example optimization
const result: PowerTuningResult = {
  functionName: 'processImage',
  currentConfig: {
    memory: 1024, // MB
    avgDuration: 3200, // ms
    avgCost: 0.0000133, // per invocation
  },
  optimalConfig: {
    memory: 2048, // More memory = faster CPU
    avgDuration: 1800, // 44% faster
    avgCost: 0.0000119, // 11% cheaper
  },
  savings: {
    costReduction: 10.5,
    durationReduction: 43.8,
    monthlySavings: 142, // 1M invocations/month
  },
};

// Apply optimization
aws lambda update-function-configuration \
  --function-name processImage \
  --memory-size 2048
```

### 5. Cost Tracking & Validation

**Pre/Post Optimization Comparison**:
```typescript
interface OptimizationResult {
  optimizationId: string;
  implementationDate: Date;
  resource: string;
  action: string;
  preOptimization: {
    cost: number;
    metrics: Record<string, number>;
  };
  postOptimization: {
    cost: number;
    metrics: Record<string, number>;
  };
  actualSavings: number;
  projectedSavings: number;
  varianceExplanation: string;
}

// Track for 30 days post-optimization
async function validateOptimization(optId: string): Promise<OptimizationResult> {
  const baseline = await getCostBaseline(optId, 'before');
  const current = await getCostBaseline(optId, 'after');
  
  const actualSavings = baseline.cost - current.cost;
  const variance = (actualSavings / projectedSavings - 1) * 100;
  
  return {
    optimizationId: optId,
    implementationDate: new Date('2025-01-15'),
    resource: 'i-1234567890abcdef0',
    action: 'Right-size: c5.2xlarge → c5.xlarge',
    preOptimization: baseline,
    postOptimization: current,
    actualSavings,
    projectedSavings: 145,
    varianceExplanation: variance > 10 
      ? 'Higher traffic than baseline period'
      : 'Within expected range',
  };
}
```

### 6. Automation Scripts

**Auto-Stop Dev/Test Instances**:
```typescript
// Lambda function to auto-stop instances outside business hours
export async function autoStopDevInstances() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Outside business hours (6pm-8am weekdays, all weekend)
  const isOffHours = hour < 8 || hour >= 18 || day === 0 || day === 6;
  
  if (!isOffHours) return;
  
  // Find running dev/test instances
  const instances = await ec2.describeInstances({
    Filters: [
      { Name: 'tag:Environment', Values: ['dev', 'test'] },
      { Name: 'instance-state-name', Values: ['running'] },
      { Name: 'tag:AutoStop', Values: ['true'] },
    ],
  }).promise();
  
  const instanceIds = instances.Reservations
    .flatMap(r => r.Instances || [])
    .map(i => i.InstanceId!);
  
  if (instanceIds.length > 0) {
    await ec2.stopInstances({ InstanceIds: instanceIds }).promise();
    console.log(`Stopped ${instanceIds.length} dev/test instances`);
  }
}

// Schedule: Run every hour
// CloudWatch Events: cron(0 * * * ? *)
```

### 7. Optimization Dashboard

**Cost Savings Dashboard**:
```typescript
interface SavingsDashboard {
  period: string;
  totalSavings: number;
  savingsByCategory: {
    compute: number;
    storage: number;
    database: number;
    network: number;
    other: number;
  };
  topOptimizations: Array<{
    description: string;
    savings: number;
    status: 'completed' | 'in-progress' | 'planned';
  }>;
  roi: number;
}

// Monthly dashboard
const dashboard: SavingsDashboard = {
  period: 'January 2025',
  totalSavings: 12450,
  savingsByCategory: {
    compute: 6200,
    storage: 1800,
    database: 3500,
    network: 750,
    other: 200,
  },
  topOptimizations: [
    {
      description: 'Right-sized 32 EC2 instances',
      savings: 4100,
      status: 'completed',
    },
    {
      description: 'Purchased 5 RDS Reserved Instances',
      savings: 3500,
      status: 'completed',
    },
    {
      description: 'Terminated 15 idle instances',
      savings: 2100,
      status: 'completed',
    },
  ],
  roi: 8.5, // Implementation time vs savings
};
```

## Workflow

1. **Review Recommendations**: Prioritize by savings + effort
2. **Safety Check**: Verify backups, monitoring, approvals
3. **Create Rollback Plan**: Document restore steps
4. **Implement Change**: Execute optimization (staged rollout)
5. **Monitor Impact**: Track metrics for 24-48 hours
6. **Validate Savings**: Compare actual vs projected costs
7. **Document Results**: Update cost tracking dashboard

## Example Usage

**User**: "Optimize our over-provisioned EC2 instances"

**Response**:
- Reviews 32 over-provisioned instances
- Creates safety checklist (backups, monitoring, approvals)
- Generates resize plan with rollback procedures
- Provides automated scripts for off-hours execution
- Sets up post-optimization monitoring
- Projects $4,100/month savings

## When to Use

- Implementing cost analysis recommendations
- Emergency budget cuts
- Scheduled optimization sprints
- New architecture deployment
- Post-incident cost spike mitigation

Optimize cloud costs safely with automated tooling!
