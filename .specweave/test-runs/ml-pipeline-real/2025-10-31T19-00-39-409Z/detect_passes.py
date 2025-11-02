
import json
import os

detections_file = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T19-00-39-409Z/detections_visualized/detections.json"

with open(detections_file, 'r') as f:
    detections_data = json.load(f)

# Simple pass detection: check for ball movement between players
passes = []
prev_ball_pos = None

for i, frame_data in enumerate(detections_data):
    if len(frame_data['ball']) > 0:
        ball = frame_data['ball'][0]
        ball_center = [
            (ball['bbox'][0] + ball['bbox'][2]) / 2,
            (ball['bbox'][1] + ball['bbox'][3]) / 2
        ]

        if prev_ball_pos is not None:
            # Calculate ball movement
            dx = ball_center[0] - prev_ball_pos[0]
            dy = ball_center[1] - prev_ball_pos[1]
            distance = (dx**2 + dy**2)**0.5

            # If ball moved significantly, might be a pass
            if distance > 100:  # Threshold in pixels
                # Find nearest players before and after
                passes.append({
                    'frame': i,
                    'distance': round(distance, 2),
                    'players_in_frame': len(frame_data['players'])
                })

        prev_ball_pos = ball_center

print(f"⚽ Detected {len(passes)} potential passes")
if len(passes) > 0:
    print(f"   Example pass events:")
    for pass_event in passes[:5]:  # Show first 5
        print(f"   - Frame {pass_event['frame']}: {pass_event['players_in_frame']} players, ball moved {pass_event['distance']}px")
else:
    print(f"   ⚠️  No passes detected (ball detection may be limited)")
