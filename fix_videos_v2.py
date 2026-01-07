import os
import subprocess
from pathlib import Path
import urllib.request
import zipfile
import shutil
import io

# Configuration
# Using absolute paths as per user environment
base_dir = Path(r"c:\Users\useer\Downloads\fishurger-main\fishurger-main")
video_dir = base_dir / "frontend" / "video"
img_dir = base_dir / "frontend" / "img"
ffmpeg_dir = base_dir / "ffmpeg_bin"
ffmpeg_exe = ffmpeg_dir / "ffmpeg.exe"

videos_to_process = ["IMG_7651.mp4", "IMG_7584.mp4"]

def setup_ffmpeg():
    if ffmpeg_exe.exists():
        print("[*] FFmpeg already exists.")
        return str(ffmpeg_exe)
    
    print("[*] Downloading FFmpeg (this may take a moment)...")
    url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    
    try:
        with urllib.request.urlopen(url) as response:
            with zipfile.ZipFile(io.BytesIO(response.read())) as z:
                # Extract only ffmpeg.exe
                for file in z.namelist():
                    if file.endswith("bin/ffmpeg.exe"):
                        ffmpeg_dir.mkdir(exist_ok=True)
                        with z.open(file) as source, open(ffmpeg_exe, "wb") as target:
                            shutil.copyfileobj(source, target)
                        print("[✓] FFmpeg downloaded and extracted.")
                        return str(ffmpeg_exe)
    except Exception as e:
        print(f"[X] Failed to download FFmpeg: {e}")
        return None

def process_video(filename, ffmpeg_path):
    input_path = video_dir / filename
    temp_path = video_dir / f"temp_{filename}"
    poster_path = img_dir / f"{input_path.stem}_poster.jpg"
    
    if not input_path.exists():
        print(f"[!] File not found: {input_path}")
        return

    print(f"Processing {filename}...")

    # 1. Compress Video (Mobile Friendly: H.264, yuv420p, faststart)
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
        if input_path.exists(): os.remove(input_path)
        os.rename(temp_path, input_path)
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
        "-vf", "scale='min(720,iw)':-2",
        str(poster_path)
    ]
    
    try:
        subprocess.run(cmd_poster, check=True)
        print(f"  [✓] Generated poster: {poster_path.name}")
    except subprocess.CalledProcessError as e:
        print(f"  [X] Poster generation failed for {filename}: {e}")

# Run
ffmpeg_bin = setup_ffmpeg()
if ffmpeg_bin:
    for video in videos_to_process:
        process_video(video, ffmpeg_bin)
else:
    print("[X] Could not proceed without FFmpeg.")
