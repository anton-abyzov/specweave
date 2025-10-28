# Test Results: cost-optimizer

## How to Run Tests

### Test 1: Basic Comparison
**Prompt**: "What's the cheapest way to host my NextJS SaaS with Postgres for 1000 users?"

**Expected**: Hetzner recommended at ~$11/month

**Verification**:
- [ ] Hetzner recommended
- [ ] Cost under $15/month
- [ ] At least 3 platforms compared
- [ ] Savings shown vs alternatives

### Test 2: Budget Constraint
**Prompt**: "I need to deploy my app with database, budget is max $20/month"

**Expected**: Recommendation stays under $20

**Verification**:
- [ ] Recommended cost < $20
- [ ] Budget utilization shown
- [ ] Expensive options excluded

### Test 3: Scale Requirement
**Prompt**: "I need to host my SaaS for 10,000 users with high availability"

**Expected**: Hetzner CX21/CX31 recommended at $27-34/month

**Verification**:
- [ ] Handles 10k users
- [ ] Scaling path provided
- [ ] Cost competitive with alternatives

## Test Execution

**Status**: ⏳ Pending

Mark tests as ✅ Passed or ❌ Failed after execution.

## Success Criteria

✅ All 3 tests recommend appropriate platform
✅ Cost estimates accurate within 10%
✅ Savings calculations correct
