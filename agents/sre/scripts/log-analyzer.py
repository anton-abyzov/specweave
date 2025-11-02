#!/usr/bin/env python3

"""
log-analyzer.py
Parse application/system logs for error patterns and anomalies

Usage: python3 log-analyzer.py /var/log/application.log
       python3 log-analyzer.py /var/log/application.log --errors-only
       python3 log-analyzer.py /var/log/application.log --since "2025-10-26 14:00"
"""

import re
import sys
import argparse
from datetime import datetime, timedelta
from collections import Counter, defaultdict

def parse_args():
    parser = argparse.ArgumentParser(description='Analyze log files for errors and patterns')
    parser.add_argument('logfile', help='Path to log file')
    parser.add_argument('--errors-only', action='store_true', help='Show only errors (ERROR, FATAL)')
    parser.add_argument('--warnings', action='store_true', help='Include warnings')
    parser.add_argument('--since', help='Show logs since timestamp (YYYY-MM-DD HH:MM)')
    parser.add_argument('--until', help='Show logs until timestamp (YYYY-MM-DD HH:MM)')
    parser.add_argument('--pattern', help='Search for specific pattern (regex)')
    parser.add_argument('--top', type=int, default=10, help='Show top N errors (default: 10)')
    return parser.parse_args()

def parse_log_line(line):
    """Parse common log formats"""
    # Try different log formats
    patterns = [
        # JSON: {"timestamp":"2025-10-26T14:00:00Z","level":"ERROR","message":"..."}
        r'\{"timestamp":"(?P<timestamp>[^"]+)".*"level":"(?P<level>[^"]+)".*"message":"(?P<message>[^"]+)"',

        # Standard: [2025-10-26 14:00:00] ERROR: message
        r'\[(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s+(?P<level>\w+):\s+(?P<message>.*)',

        # Syslog: Oct 26 14:00:00 hostname application[1234]: ERROR message
        r'(?P<timestamp>\w+ \d+ \d{2}:\d{2}:\d{2})\s+\S+\s+\S+:\s+(?P<level>\w+)\s+(?P<message>.*)',

        # Simple: 2025-10-26 14:00:00 ERROR message
        r'(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(?P<level>\w+)\s+(?P<message>.*)',
    ]

    for pattern in patterns:
        match = re.match(pattern, line)
        if match:
            return match.groupdict()

    # If no pattern matched, return raw line
    return {'timestamp': None, 'level': 'INFO', 'message': line.strip()}

def parse_timestamp(ts_str):
    """Parse various timestamp formats"""
    if not ts_str:
        return None

    formats = [
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%d %H:%M:%S',
        '%b %d %H:%M:%S',
    ]

    for fmt in formats:
        try:
            return datetime.strptime(ts_str, fmt)
        except ValueError:
            continue

    return None

def main():
    args = parse_args()

    # Parse filters
    since = datetime.strptime(args.since, '%Y-%m-%d %H:%M') if args.since else None
    until = datetime.strptime(args.until, '%Y-%m-%d %H:%M') if args.until else None

    # Stats
    total_lines = 0
    error_count = 0
    warning_count = 0
    error_messages = Counter()
    errors_by_hour = defaultdict(int)
    error_timeline = []

    print(f"Analyzing log file: {args.logfile}")
    print("=" * 80)
    print()

    try:
        with open(args.logfile, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                total_lines += 1

                # Parse log line
                parsed = parse_log_line(line)
                level = parsed.get('level', '').upper()
                message = parsed.get('message', '')
                timestamp = parse_timestamp(parsed.get('timestamp'))

                # Filter by time range
                if since and timestamp and timestamp < since:
                    continue
                if until and timestamp and timestamp > until:
                    continue

                # Filter by pattern
                if args.pattern and not re.search(args.pattern, message, re.IGNORECASE):
                    continue

                # Filter by level
                if args.errors_only and level not in ['ERROR', 'FATAL', 'CRITICAL']:
                    continue

                # Count errors and warnings
                if level in ['ERROR', 'FATAL', 'CRITICAL']:
                    error_count += 1

                    # Extract error message (first 100 chars)
                    error_key = message[:100] if len(message) > 100 else message
                    error_messages[error_key] += 1

                    # Group by hour
                    if timestamp:
                        hour_key = timestamp.strftime('%Y-%m-%d %H:00')
                        errors_by_hour[hour_key] += 1
                        error_timeline.append((timestamp, message))

                elif level in ['WARN', 'WARNING'] and args.warnings:
                    warning_count += 1

        # Print summary
        print(f"📊 SUMMARY")
        print(f"---------")
        print(f"Total lines: {total_lines:,}")
        print(f"Errors: {error_count:,}")
        if args.warnings:
            print(f"Warnings: {warning_count:,}")
        print()

        # Top errors
        if error_messages:
            print(f"🔥 TOP {args.top} ERRORS")
            print(f"{'Count':<10} {'Message':<70}")
            print("-" * 80)
            for msg, count in error_messages.most_common(args.top):
                msg_short = (msg[:67] + '...') if len(msg) > 70 else msg
                print(f"{count:<10} {msg_short}")
            print()

        # Errors by hour
        if errors_by_hour:
            print(f"📈 ERRORS BY HOUR")
            print(f"{'Hour':<20} {'Count':<10} {'Graph':<50}")
            print("-" * 80)

            max_errors = max(errors_by_hour.values())
            for hour in sorted(errors_by_hour.keys()):
                count = errors_by_hour[hour]
                bar_length = int((count / max_errors) * 40)
                bar = '█' * bar_length
                print(f"{hour:<20} {count:<10} {bar}")
            print()

        # Error timeline (last 20)
        if error_timeline:
            print(f"⏱️  ERROR TIMELINE (Last 20)")
            print(f"{'Timestamp':<20} {'Message':<60}")
            print("-" * 80)

            for timestamp, message in sorted(error_timeline, reverse=True)[:20]:
                ts_str = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                msg_short = (message[:57] + '...') if len(message) > 60 else message
                print(f"{ts_str:<20} {msg_short}")
            print()

        # Recommendations
        print(f"💡 RECOMMENDATIONS")
        print(f"-----------------")

        if error_count == 0:
            print("✅ No errors found. System looks healthy!")
        elif error_count < 10:
            print(f"⚠️  {error_count} errors found. Review above for details.")
        elif error_count < 100:
            print(f"⚠️  {error_count} errors found. Investigate top errors.")
        else:
            print(f"🚨 {error_count} errors found! Immediate investigation required.")
            print("   - Check for cascading failures")
            print("   - Review error timeline for spike")
            print("   - Check related services")

        if errors_by_hour:
            # Find hour with most errors
            peak_hour = max(errors_by_hour.items(), key=lambda x: x[1])
            print(f"\n📍 Peak error hour: {peak_hour[0]} ({peak_hour[1]} errors)")
            print(f"   - Review what happened at this time")
            print(f"   - Check deployment, traffic spike, external dependency")

        print()

    except FileNotFoundError:
        print(f"❌ Error: Log file not found: {args.logfile}")
        sys.exit(1)
    except PermissionError:
        print(f"❌ Error: Permission denied: {args.logfile}")
        print(f"   Try: sudo python3 {sys.argv[0]} {args.logfile}")
        sys.exit(1)

if __name__ == '__main__':
    main()
