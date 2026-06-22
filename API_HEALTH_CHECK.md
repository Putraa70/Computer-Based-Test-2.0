# ✅ P2: Enterprise Health Check Endpoint

## Overview
The health check endpoint provides real-time monitoring of system health across critical services (database, Redis, queue, disk).

## Endpoint
```
GET /api/health
```

## Authentication
None required - health checks should be publicly accessible for monitoring tools.

## Response Format

### Healthy System (200 OK)
```json
{
  "status": "healthy",
  "timestamp": "2026-05-12T10:30:45Z",
  "services": {
    "database": {
      "status": "healthy",
      "response_time": "ok",
      "message": "Database connected. 1250 active test sessions."
    },
    "redis": {
      "status": "healthy",
      "memory_used": "256MB",
      "memory_limit": "512MB",
      "message": "Redis connected and healthy"
    },
    "queue": {
      "status": "healthy",
      "failed_jobs": 2,
      "old_failed_jobs": 0,
      "message": "Queue healthy. 2 failed jobs in queue."
    },
    "disk": {
      "status": "healthy",
      "usage_percent": 45.2,
      "free_gb": 245.8,
      "total_gb": 448.0,
      "message": "Disk 45.2% full"
    }
  }
}
```

### Degraded System (503 Service Unavailable)
```json
{
  "status": "degraded",
  "timestamp": "2026-05-12T10:30:45Z",
  "services": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout",
      "message": "Database connection failed"
    },
    "redis": {
      "status": "degraded",
      "memory_used": "480MB",
      "memory_limit": "512MB",
      "evicted_keys": 1450,
      "warning": "Redis is evicting keys - memory pressure detected"
    },
    "disk": {
      "status": "warning",
      "usage_percent": 87.5,
      "free_gb": 55.2,
      "total_gb": 448.0,
      "message": "Disk 87.5% full"
    }
  }
}
```

## Status Codes
- **200 OK**: All services healthy
- **503 Service Unavailable**: One or more services degraded/unhealthy

## Monitoring Rules

### Critical Alerts (page on-call)
- Database: unhealthy
- Redis: unhealthy
- Disk: > 90% full

### Warning Alerts (notify team)
- Redis: memory evictions occurring
- Queue: > 100 failed jobs
- Disk: > 80% full

## Usage Examples

### Monitoring Script (Nagios/Zabbix)
```bash
#!/bin/bash
RESPONSE=$(curl -s https://cbt.example.com/api/health)
STATUS=$(echo $RESPONSE | jq -r '.status')

if [ "$STATUS" = "healthy" ]; then
  exit 0
fi
exit 2
```

### Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 80
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

## Implementation Details

### Database Check
- Tests PDO connection
- Counts active test_users to verify table integrity
- Helps catch connection pool exhaustion

### Redis Check
- Pings Redis instance
- Reads memory usage and eviction stats
- Detects memory pressure (degraded status if evictions > 0)

### Queue Check
- Counts failed jobs table
- Alerts if > 100 failed jobs
- Shows age of failed jobs (old jobs may indicate stuck workers)

### Disk Check
- Checks root partition usage
- Warns if > 80% full
- Critical if > 90% full

## Caching
Health checks do not cache results - they always read live status to ensure accurate monitoring.

## Rate Limiting
Not rate-limited to allow frequent monitoring tool checks (e.g., every 10 seconds).
