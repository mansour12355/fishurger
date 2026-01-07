import os
import subprocess
from pathlib import Path

# Configuration
video_dir = Path(r"c:\Users\useer\Downloads\fishurger-main\fishurger-main\frontend\video")
ffmpeg_path = r"c:\Users\useer\Downloads\fishurger-main\fishurger-main\ffmpeg.exe"
videos_to_process = ["IMG_7651.mp4", "IMG_7584.mp4"]

def process_video(filename):
    input_path = video_dir / filename
    temp_path = video_dir / f"temp_{filename}"
    poster_path = video_dir.parent / "img" / f"{input_path.stem}_poster.jpg"
    
    if not input_path.exists():
        print(f"Skipping {filename}: File not found")
        return

    print(f"Processing {filename}...")

    # 1. Compress Video (Mobile Friendly: H.264, yuv420p, faststart)
    # -vf scale='min(720,iw)':-2 ensures width is at most 720px, height auto-calculated, divisible by 2
    cmd_compress = [
        ffmpeg_path, "-y",
        "-i", str(input_path),
        "-vcodec", "libx264",
        "-profile:v", "main",
        "-level", "3.1",
        "-pix_fmt", "yuv420p", # Critical for iOS
        "-preset", "medium",
        "-crf", "23",
        "-vf", "scale='min(720,iw)':-2",
        "-acodec", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        str(temp_path)
    ]
    
    try:
        subprocess.run(cmd_compress, check=True)
        # Replace original with compressed
        os.replace(temp_path, input_path)
        print(f"  [✓] Compressed {filename}")
    except subprocess.CalledProcessError as e:
        print(f"  [X] Compression failed for {filename}: {e}")
        if temp_path.exists(): os.remove(temp_path)

    # 2. Generate Poster (First Frame)
    cmd_poster = [
        ffmpeg_path, "-y",
        "-i", str(input_path),
        "-ss", "00:00:01", 
        "-vframes", "1",
        "-q:v", "2",
        str(poster_path)
    ]
    
    try:
        subprocess.run(cmd_poster, check=True)
        print(f"  [✓] Generated poster: {poster_path.name}")
    except subprocess.CalledProcessError as e:
        print(f"  [X] Poster generation failed for {filename}: {e}")

# Run
for video in videos_to_process:
    process_video(video)
