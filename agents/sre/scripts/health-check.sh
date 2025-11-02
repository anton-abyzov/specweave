#!/bin/bash

# health-check.sh
# Quick system health check across all layers
# Usage: ./health-check.sh

set -e

echo "========================================="
echo "SYSTEM HEALTH CHECK"
echo "========================================="
echo "Date: $(date)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Thresholds
CPU_WARNING=70
CPU_CRITICAL=90
MEM_WARNING=80
MEM_CRITICAL=90
DISK_WARNING=80
DISK_CRITICAL=90

# Helper function for status
print_status() {
    local metric=$1
    local value=$2
    local warning=$3
    local critical=$4
    local unit=$5

    if (( $(echo "$value >= $critical" | bc -l) )); then
        echo -e "${RED}✗ $metric: ${value}${unit} (CRITICAL)${NC}"
        return 2
    elif (( $(echo "$value >= $warning" | bc -l) )); then
        echo -e "${YELLOW}⚠ $metric: ${value}${unit} (WARNING)${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $metric: ${value}${unit} (OK)${NC}"
        return 0
    fi
}

# 1. CPU Check
echo "1. CPU Usage"
echo "-------------"
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
print_status "CPU" "$CPU_USAGE" "$CPU_WARNING" "$CPU_CRITICAL" "%"

# Top CPU processes
echo "   Top 5 CPU processes:"
ps aux | sort -nrk 3,3 | head -5 | awk '{printf "   - %s (PID %s): %.1f%%\n", $11, $2, $3}'
echo ""

# 2. Memory Check
echo "2. Memory Usage"
echo "---------------"
MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
print_status "Memory" "$MEM_USAGE" "$MEM_WARNING" "$MEM_CRITICAL" "%"

# Memory details
free -h | grep -E "Mem|Swap" | awk '{printf "   %s: %s used / %s total\n", $1, $3, $2}'

# Top memory processes
echo "   Top 5 memory processes:"
ps aux | sort -nrk 4,4 | head -5 | awk '{printf "   - %s (PID %s): %.1f%%\n", $11, $2, $4}'
echo ""

# 3. Disk Check
echo "3. Disk Usage"
echo "-------------"
df -h | grep -vE '^Filesystem|tmpfs|cdrom|loop' | while read line; do
    DISK=$(echo $line | awk '{print $1}')
    MOUNT=$(echo $line | awk '{print $6}')
    USAGE=$(echo $line | awk '{print $5}' | sed 's/%//')

    print_status "$MOUNT" "$USAGE" "$DISK_WARNING" "$DISK_CRITICAL" "%"
done

# Disk I/O
echo "   Disk I/O:"
if command -v iostat &> /dev/null; then
    iostat -x 1 2 | tail -n +4 | awk 'NR>1 {printf "   %s: %.1f%% utilization\n", $1, $NF}'
else
    echo "   (iostat not installed)"
fi
echo ""

# 4. Network Check
echo "4. Network"
echo "----------"

# Check connectivity
if ping -c 1 -W 2 8.8.8.8 &> /dev/null; then
    echo -e "${GREEN}✓ Internet connectivity: OK${NC}"
else
    echo -e "${RED}✗ Internet connectivity: FAILED${NC}"
fi

# DNS check
if nslookup google.com &> /dev/null; then
    echo -e "${GREEN}✓ DNS resolution: OK${NC}"
else
    echo -e "${RED}✗ DNS resolution: FAILED${NC}"
fi

# Connection count
CONN_COUNT=$(netstat -an 2>/dev/null | grep ESTABLISHED | wc -l)
echo "   Active connections: $CONN_COUNT"
echo ""

# 5. Database Check (if PostgreSQL installed)
echo "5. Database (PostgreSQL)"
echo "------------------------"
if command -v psql &> /dev/null; then
    # Try to connect
    if sudo -u postgres psql -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL: Running${NC}"

        # Connection count
        CONN=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;")
        MAX_CONN=$(sudo -u postgres psql -t -c "SHOW max_connections;")
        CONN_PCT=$(echo "scale=1; $CONN / $MAX_CONN * 100" | bc)
        print_status "Connections" "$CONN_PCT" "80" "90" "% ($CONN/$MAX_CONN)"

        # Database size
        echo "   Database sizes:"
        sudo -u postgres psql -t -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE datistemplate = false;" | head -5 | awk '{printf "   - %s: %s\n", $1, $3}'
    else
        echo -e "${RED}✗ PostgreSQL: Not accessible${NC}"
    fi
else
    echo "   PostgreSQL not installed"
fi
echo ""

# 6. Services Check
echo "6. Services"
echo "-----------"

# List of services to check (customize as needed)
SERVICES=("nginx" "postgresql" "redis-server")

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet $service 2>/dev/null; then
        echo -e "${GREEN}✓ $service: Running${NC}"
    else
        if systemctl list-unit-files | grep -q "^$service"; then
            echo -e "${RED}✗ $service: Stopped${NC}"
        else
            echo "   $service: Not installed"
        fi
    fi
done
echo ""

# 7. API Response Time (if applicable)
echo "7. API Health"
echo "-------------"

# Check localhost health endpoint
if command -v curl &> /dev/null; then
    HEALTH_URL="http://localhost/health"

    # Time the request
    RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /dev/null $HEALTH_URL 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | sed -n '1p')
    TIME=$(echo "$RESPONSE" | sed -n '2p')

    if [ "$HTTP_CODE" = "200" ]; then
        TIME_MS=$(echo "$TIME * 1000" | bc)
        echo -e "${GREEN}✓ Health endpoint: Responding (${TIME_MS}ms)${NC}"
    else
        echo -e "${RED}✗ Health endpoint: Failed (HTTP $HTTP_CODE)${NC}"
    fi
else
    echo "   curl not installed"
fi
echo ""

# 8. Load Average
echo "8. Load Average"
echo "---------------"
LOAD=$(uptime | awk -F'load average:' '{ print $2 }')
CORES=$(nproc)
echo "   Load: $LOAD"
echo "   CPU cores: $CORES"
LOAD_1MIN=$(echo $LOAD | awk -F', ' '{print $1}' | xargs)
LOAD_PER_CORE=$(echo "scale=2; $LOAD_1MIN / $CORES" | bc)

if (( $(echo "$LOAD_PER_CORE >= 2.0" | bc -l) )); then
    echo -e "${RED}✗ Load per core: ${LOAD_PER_CORE} (HIGH)${NC}"
elif (( $(echo "$LOAD_PER_CORE >= 1.0" | bc -l) )); then
    echo -e "${YELLOW}⚠ Load per core: ${LOAD_PER_CORE} (ELEVATED)${NC}"
else
    echo -e "${GREEN}✓ Load per core: ${LOAD_PER_CORE} (OK)${NC}"
fi
echo ""

# 9. Recent Errors
echo "9. Recent Errors (last 10 minutes)"
echo "-----------------------------------"
if [ -f /var/log/syslog ]; then
    ERROR_COUNT=$(grep -c "error\|Error\|ERROR" /var/log/syslog 2>/dev/null | tail -1000 || echo 0)
    echo "   Syslog errors: $ERROR_COUNT"
fi

# Check journal if systemd
if command -v journalctl &> /dev/null; then
    JOURNAL_ERRORS=$(journalctl --since "10 minutes ago" --priority=err --no-pager | wc -l)
    echo "   Journalctl errors: $JOURNAL_ERRORS"
fi
echo ""

# Summary
echo "========================================="
echo "SUMMARY"
echo "========================================="
echo "Health check completed at $(date)"
echo ""
echo "Next steps:"
echo "- If any CRITICAL issues, investigate immediately"
echo "- If WARNING issues, monitor and plan mitigation"
echo "- Review playbooks: ../playbooks/"
echo ""
