#!/bin/bash

# metrics-collector.sh
# Gather system metrics for incident diagnosis
# Usage: ./metrics-collector.sh [output_file]

set -e

OUTPUT_FILE=${1:-"metrics-$(date +%Y%m%d-%H%M%S).txt"}

echo "Collecting system metrics..."
echo "Output: $OUTPUT_FILE"
echo ""

{
    echo "========================================="
    echo "SYSTEM METRICS COLLECTION"
    echo "========================================="
    echo "Date: $(date)"
    echo "Hostname: $(hostname)"
    echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
    echo ""

    # 1. CPU Metrics
    echo "========================================="
    echo "1. CPU METRICS"
    echo "========================================="
    echo ""

    echo "CPU Info:"
    lscpu | grep -E "^Model name|^CPU\(s\)|^Thread|^Core|^Socket"
    echo ""

    echo "CPU Usage (snapshot):"
    top -bn1 | head -20
    echo ""

    echo "Load Average:"
    uptime
    echo ""

    if command -v mpstat &> /dev/null; then
        echo "CPU by Core:"
        mpstat -P ALL 1 1
        echo ""
    fi

    # 2. Memory Metrics
    echo "========================================="
    echo "2. MEMORY METRICS"
    echo "========================================="
    echo ""

    echo "Memory Overview:"
    free -h
    echo ""

    echo "Memory Details:"
    cat /proc/meminfo | head -20
    echo ""

    echo "Top Memory Processes:"
    ps aux | sort -nrk 4,4 | head -10
    echo ""

    # 3. Disk Metrics
    echo "========================================="
    echo "3. DISK METRICS"
    echo "========================================="
    echo ""

    echo "Disk Usage:"
    df -h
    echo ""

    echo "Inode Usage:"
    df -i
    echo ""

    if command -v iostat &> /dev/null; then
        echo "Disk I/O Stats:"
        iostat -x 1 5
        echo ""
    fi

    echo "Disk Space by Directory (/):"
    du -sh /* 2>/dev/null | sort -hr | head -20
    echo ""

    # 4. Network Metrics
    echo "========================================="
    echo "4. NETWORK METRICS"
    echo "========================================="
    echo ""

    echo "Network Interfaces:"
    ip addr show
    echo ""

    echo "Network Statistics:"
    netstat -s | head -50
    echo ""

    echo "Active Connections:"
    netstat -an | grep ESTABLISHED | wc -l
    echo ""

    echo "Top 10 IPs by Connection Count:"
    netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -10
    echo ""

    if command -v ss &> /dev/null; then
        echo "Socket Stats:"
        ss -s
        echo ""
    fi

    # 5. Process Metrics
    echo "========================================="
    echo "5. PROCESS METRICS"
    echo "========================================="
    echo ""

    echo "Process Count:"
    ps aux | wc -l
    echo ""

    echo "Top CPU Processes:"
    ps aux | sort -nrk 3,3 | head -10
    echo ""

    echo "Top Memory Processes:"
    ps aux | sort -nrk 4,4 | head -10
    echo ""

    echo "Zombie Processes:"
    ps aux | grep -E "<defunct>|Z" | grep -v grep
    echo ""

    # 6. Database Metrics (PostgreSQL)
    echo "========================================="
    echo "6. DATABASE METRICS (PostgreSQL)"
    echo "========================================="
    echo ""

    if command -v psql &> /dev/null; then
        if sudo -u postgres psql -c "SELECT 1" &> /dev/null; then
            echo "PostgreSQL Connection Count:"
            sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;"
            echo ""

            echo "PostgreSQL Max Connections:"
            sudo -u postgres psql -t -c "SHOW max_connections;"
            echo ""

            echo "PostgreSQL Active Queries:"
            sudo -u postgres psql -x -c "SELECT pid, usename, application_name, state, query FROM pg_stat_activity WHERE state != 'idle' LIMIT 10;"
            echo ""

            echo "PostgreSQL Database Sizes:"
            sudo -u postgres psql -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE datistemplate = false;"
            echo ""

            echo "PostgreSQL Table Sizes (top 10):"
            sudo -u postgres psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
            echo ""

            if command -v pg_stat_statements &> /dev/null; then
                echo "PostgreSQL Slow Queries (top 5):"
                sudo -u postgres psql -c "SELECT query, calls, total_exec_time, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;"
                echo ""
            fi
        else
            echo "PostgreSQL not accessible"
            echo ""
        fi
    else
        echo "PostgreSQL not installed"
        echo ""
    fi

    # 7. Web Server Metrics (nginx)
    echo "========================================="
    echo "7. WEB SERVER METRICS (nginx)"
    echo "========================================="
    echo ""

    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo "Nginx Status: Running"

        if [ -f /var/log/nginx/access.log ]; then
            echo ""
            echo "Nginx Request Count (last 1000 lines):"
            tail -1000 /var/log/nginx/access.log | wc -l

            echo ""
            echo "Nginx Status Codes (last 1000 lines):"
            tail -1000 /var/log/nginx/access.log | awk '{print $9}' | sort | uniq -c | sort -nr

            echo ""
            echo "Nginx Top 10 URLs:"
            tail -1000 /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -nr | head -10

            echo ""
            echo "Nginx Top 10 IPs:"
            tail -1000 /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -nr | head -10
        fi
    else
        echo "Nginx not running"
    fi
    echo ""

    # 8. Application Metrics (customize as needed)
    echo "========================================="
    echo "8. APPLICATION METRICS"
    echo "========================================="
    echo ""

    echo "Application Processes:"
    ps aux | grep -E "node|java|python|ruby" | grep -v grep
    echo ""

    echo "Application Ports:"
    netstat -tlnp 2>/dev/null | grep -E "node|java|python|ruby"
    echo ""

    # 9. System Logs (recent errors)
    echo "========================================="
    echo "9. RECENT SYSTEM ERRORS"
    echo "========================================="
    echo ""

    echo "Recent Syslog Errors (last 50):"
    if [ -f /var/log/syslog ]; then
        grep -i "error\|fail\|critical" /var/log/syslog | tail -50
    else
        echo "Syslog not found"
    fi
    echo ""

    echo "Recent Journal Errors (last 10 minutes):"
    if command -v journalctl &> /dev/null; then
        journalctl --since "10 minutes ago" --priority=err --no-pager | tail -50
    else
        echo "journalctl not available"
    fi
    echo ""

    # 10. System Info
    echo "========================================="
    echo "10. SYSTEM INFORMATION"
    echo "========================================="
    echo ""

    echo "OS Version:"
    cat /etc/os-release 2>/dev/null || uname -a
    echo ""

    echo "Kernel Version:"
    uname -r
    echo ""

    echo "System Time:"
    date
    echo ""

    echo "Timezone:"
    timedatectl 2>/dev/null || cat /etc/timezone
    echo ""

    # Summary
    echo "========================================="
    echo "COLLECTION COMPLETE"
    echo "========================================="
    echo "Collected at: $(date)"
    echo "Metrics saved to: $OUTPUT_FILE"
    echo ""

} > "$OUTPUT_FILE" 2>&1

# Print summary to console
echo ""
echo "✅ Metrics collection complete!"
echo ""
echo "Summary:"
grep -E "CPU Usage|Memory Overview|Disk Usage|Active Connections|PostgreSQL Connection Count" "$OUTPUT_FILE" | head -20
echo ""
echo "Full report: $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo "  - Review metrics for anomalies"
echo "  - Compare with baseline metrics"
echo "  - Share with team for analysis"
echo ""
