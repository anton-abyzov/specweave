
import cv2
import numpy as np
import os

def create_synthetic_soccer_frame(width=640, height=640):
    """Create synthetic soccer field image with players"""
    # Green field background
    img = np.zeros((height, width, 3), dtype=np.uint8)
    img[:, :] = [34, 139, 34]  # Green

    # White field lines
    cv2.line(img, (width//2, 0), (width//2, height), (255, 255, 255), 2)
    cv2.circle(img, (width//2, height//2), 50, (255, 255, 255), 2)

    # Players (red and blue circles)
    players = []
    for i in range(5):
        x = np.random.randint(50, width-50)
        y = np.random.randint(50, height-50)
        radius = 15
        color = (0, 0, 255) if i < 3 else (255, 0, 0)  # Red or blue
        cv2.circle(img, (x, y), radius, color, -1)

        # YOLO bbox (center_x, center_y, width, height) normalized
        center_x = x / width
        center_y = y / height
        bbox_w = (radius * 2) / width
        bbox_h = (radius * 2) / height
        players.append((center_x, center_y, bbox_w, bbox_h))

    return img, players

# Create dataset
base_dir = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline/2025-11-04T18-47-17-003Z/dataset"
splits = {'train': 8, 'val': 2}

frame_count = 0
for split, count in splits.items():
    img_dir = os.path.join(base_dir, 'images', split)
    lbl_dir = os.path.join(base_dir, 'labels', split)

    for i in range(count):
        # Generate frame
        img, players = create_synthetic_soccer_frame()

        # Save image
        img_path = os.path.join(img_dir, f'frame_{frame_count:03d}.jpg')
        cv2.imwrite(img_path, img)

        # Save YOLO annotations
        lbl_path = os.path.join(lbl_dir, f'frame_{frame_count:03d}.txt')
        with open(lbl_path, 'w') as f:
            for player in players:
                # Class 0 = player
                f.write(f'0 {player[0]:.6f} {player[1]:.6f} {player[2]:.6f} {player[3]:.6f}\n')

        frame_count += 1

print(f"Generated {frame_count} frames with annotations")
