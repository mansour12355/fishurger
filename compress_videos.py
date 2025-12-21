#!/usr/bin/env python3
"""
Video Compression Script for Fish Burger Website
Compresses large video files to optimize web performance
"""

import os
import sys
import shutil
from pathlib import Path

print("=" * 50)
print("Fish Burger Video Compression Tool")
print("=" * 50)
print()

# Check if moviepy is installed
try:
    from moviepy.editor import VideoFileClip
    print("✓ moviepy library found")
except ImportError:
    print("Installing moviepy library...")
    print("This may take a minute...")
    os.system(f'"{sys.executable}" -m pip install moviepy --quiet')
    try:
        from moviepy.editor import VideoFileClip
        print("✓ moviepy installed successfully")
    except ImportError:
        print("✗ Failed to install moviepy")
        print("\nPlease install manually:")
        print(f'  {sys.executable} -m pip install moviepy')
        sys.exit(1)

print()

# Video directory
video_dir = Path("frontend/video")
if not video_dir.exists():
    print(f"✗ Video directory not found: {video_dir}")
    sys.exit(1)

# Find all MP4 files
videos = list(video_dir.glob("*.mp4"))
if not videos:
    print(f"✗ No video files found in {video_dir}")
    sys.exit(1)

print(f"Found {len(videos)} video(s) to compress")
print()

for video_path in videos:
    # Skip already compressed files
    if "_compressed" in video_path.stem or "_original" in video_path.stem:
        print(f"Skipping: {video_path.name} (already processed)")
        continue
    
    print(f"Processing: {video_path.name}")
    
    # Get original size
    original_size_mb = video_path.stat().st_size / (1024 * 1024)
    print(f"  Original size: {original_size_mb:.2f} MB")
    
    # Create backup
    backup_path = video_path.parent / f"{video_path.stem}_original{video_path.suffix}"
    if not backup_path.exists():
        shutil.copy2(video_path, backup_path)
        print(f"  Backup created: {backup_path.name}")
    
    # Compress video
    output_path = video_path.parent / f"{video_path.stem}_compressed{video_path.suffix}"
    
    try:
        print("  Compressing... (this may take a minute)")
        
        # Load video
        clip = VideoFileClip(str(video_path))
        
        # Calculate target bitrate for ~3-4 MB file
        duration = clip.duration
        target_size_mb = 4
        target_bitrate = f"{int((target_size_mb * 8192) / duration)}k"
        
        # Resize if too large
        width, height = clip.size
        if width > 1280:
            new_width = 1280
            new_height = int(height * (1280 / width))
            clip = clip.resize((new_width, new_height))
            print(f"  Resized to: {new_width}x{new_height}")
        
        # Write compressed video
        clip.write_videofile(
            str(output_path),
            codec='libx264',
            bitrate=target_bitrate,
            audio_codec='aac',
            preset='medium',
            ffmpeg_params=['-crf', '28'],
            logger=None  # Suppress verbose output
        )
        
        clip.close()
        
        # Check compressed size
        if output_path.exists():
            compressed_size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"  Compressed size: {compressed_size_mb:.2f} MB")
            print(f"  Reduction: {((original_size_mb - compressed_size_mb) / original_size_mb * 100):.1f}%")
            
            # Replace original with compressed
            video_path.unlink()
            output_path.rename(video_path)
            print(f"  ✓ Compression complete!")
        else:
            print(f"  ✗ Compression failed!")
    
    except Exception as e:
        print(f"  ✗ Error: {e}")
        if output_path.exists():
            output_path.unlink()
    
    print()

print("=" * 50)
print("Compression Complete!")
print("=" * 50)
print()
print("Next steps:")
print("1. Refresh your browser (Ctrl + F5)")
print("2. Test the gallery - videos should now play smoothly!")
print()
print("Original files backed up as: *_original.mp4")
