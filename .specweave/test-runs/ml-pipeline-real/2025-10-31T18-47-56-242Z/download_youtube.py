
import yt_dlp
import os

output_dir = "/Users/antonabyzov/Projects/github/specweave/.specweave/test-runs/ml-pipeline-real/2025-10-31T18-47-56-242Z/videos"
video_url = "https://youtu.be/mcgbGn-frj4"

ydl_opts = {
    'format': 'best[ext=mp4]/best',  # Get best quality MP4
    'outtmpl': os.path.join(output_dir, 'soccer_video.%(ext)s'),
    'quiet': False,
    'no_warnings': False,
    'merge_output_format': 'mp4',
    'nocheckcertificate': True,
    'geo_bypass': True,
    'http_headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    'retries': 10,
    'fragment_retries': 10,
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
        title = info.get('title', 'Unknown')
        duration = info.get('duration', 0)

        print(f"✅ Downloaded: {title}")
        print(f"   Duration: {duration}s")

        # Find the downloaded file
        for file in os.listdir(output_dir):
            if file.startswith('soccer_video') and file.endswith(('.mp4', '.webm', '.mkv')):
                file_path = os.path.join(output_dir, file)
                size_mb = os.path.getsize(file_path) / (1024 * 1024)
                print(f"   Size: {size_mb:.2f} MB")
                print(f"   Path: {file_path}")
except Exception as e:
    print(f"❌ Download failed: {str(e)}")
    raise
