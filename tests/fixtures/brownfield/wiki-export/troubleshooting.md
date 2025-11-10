---
expected_type: team
expected_confidence: medium
source: wiki
keywords_density: medium
---

# Troubleshooting Guide

Common issues and how to resolve them.

## Application Won't Start

**Symptoms**: Server fails to start, crashes immediately

**Possible Causes**:
1. Port already in use
2. Missing environment variables
3. Database connection failure
4. Dependency installation incomplete

**Solutions**:
1. Check port availability: `lsof -i :3000`
2. Verify `.env` file exists with required variables
3. Test database connection: `psql $DATABASE_URL`
4. Reinstall dependencies: `rm -rf node_modules && npm install`

## Database Connection Errors

**Symptoms**: `ECONNREFUSED` or `Connection timeout`

**Solutions**:
1. Verify database is running: `docker ps | grep postgres`
2. Check connection string format: `postgresql://user:pass@host:5432/db`
3. Verify network connectivity: `telnet localhost 5432`
4. Check firewall rules
5. Review database logs: `docker logs postgres-container`

## Authentication Failures

**Symptoms**: Login always fails, even with correct credentials

**Solutions**:
1. Verify JWT_SECRET is set
2. Check bcrypt salt rounds configuration
3. Clear Redis sessions: `redis-cli FLUSHALL`
4. Verify user exists in database: `SELECT * FROM users WHERE email = '...'`
5. Check password hash: Ensure using bcrypt.compare()

## Performance Issues

**Symptoms**: Slow API responses, high memory usage

**Solutions**:
1. Enable query logging to identify slow queries
2. Check for N+1 query problems
3. Verify indexes exist on frequently queried columns
4. Monitor memory usage: `docker stats`
5. Profile application with Chrome DevTools
6. Check Redis connection pooling

## Deployment Failures

**Symptoms**: CI/CD pipeline fails, Kubernetes pod crash loops

**Solutions**:
1. Check build logs: `gh run view --log`
2. Verify Docker image builds locally: `docker build -t test .`
3. Check Kubernetes pod logs: `kubectl logs pod-name`
4. Verify resource limits not exceeded: `kubectl describe pod pod-name`
5. Check secret values: `kubectl get secret app-secrets -o yaml`

## Redis Connection Issues

**Symptoms**: Session management broken, cache misses

**Solutions**:
1. Verify Redis is running: `redis-cli ping`
2. Check connection string: `redis://localhost:6379`
3. Test connection: `redis-cli -u $REDIS_URL`
4. Review Redis logs: `docker logs redis-container`
5. Check max connections: `redis-cli CONFIG GET maxclients`

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| ECONNREFUSED | Connection refused | Service not running |
| ETIMEDOUT | Connection timeout | Network/firewall issue |
| ENOTFOUND | DNS resolution failed | Check hostname |
| EADDRINUSE | Port already in use | Kill process or change port |
| EACCES | Permission denied | Check file permissions |

## Getting Help

If you can't resolve the issue:
1. Check #help Slack channel
2. Search GitHub issues
3. Ask in #engineering channel
4. Create bug report with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version)
   - Logs

## Contacts

- **DevOps Team**: devops@company.com
- **Database Admin**: dba@company.com
- **Security Team**: security@company.com
- **On-Call Engineer**: PagerDuty (see #incidents)
