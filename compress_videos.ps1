# Video Compression Script
# This script will download FFmpeg and compress your videos automatically

Write-Host "=== Fish Burger Video Compression Tool ===" -ForegroundColor Cyan
Write-Host ""

# Check if FFmpeg is already installed
$ffmpegPath = "C:\ffmpeg\bin\ffmpeg.exe"
$videoDir = ".\frontend\video"

if (-not (Test-Path $ffmpegPath)) {
    Write-Host "FFmpeg not found. Installing FFmpeg..." -ForegroundColor Yellow
    Write-Host ""
    
    # Create temp directory
    $tempDir = "$env:TEMP\ffmpeg_install"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
    
    # Download FFmpeg
    Write-Host "Downloading FFmpeg (this may take a minute)..." -ForegroundColor Yellow
    $ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    $zipPath = "$tempDir\ffmpeg.zip"
    
    try {
        Invoke-WebRequest -Uri $ffmpegUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract
        Write-Host "Extracting FFmpeg..." -ForegroundColor Yellow
        Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force
        
        # Move to C:\ffmpeg
        $extractedFolder = Get-ChildItem -Path $tempDir -Directory | Where-Object { $_.Name -like "ffmpeg-*" } | Select-Object -First 1
        if ($extractedFolder) {
            New-Item -ItemType Directory -Force -Path "C:\ffmpeg" | Out-Null
            Copy-Item -Path "$($extractedFolder.FullName)\*" -Destination "C:\ffmpeg" -Recurse -Force
            Write-Host "FFmpeg installed successfully!" -ForegroundColor Green
        }
        
        # Cleanup
        Remove-Item -Path $tempDir -Recurse -Force
    }
    catch {
        Write-Host "Error downloading FFmpeg: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install FFmpeg manually from: https://www.gyan.dev/ffmpeg/builds/" -ForegroundColor Yellow
        Write-Host "Or use the online compression tool: https://www.freeconvert.com/video-compressor" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "FFmpeg is ready!" -ForegroundColor Green
Write-Host ""

# Compress videos
Write-Host "Starting video compression..." -ForegroundColor Cyan
Write-Host ""

# Get all MP4 files
$videos = Get-ChildItem -Path $videoDir -Filter "*.mp4"

foreach ($video in $videos) {
    $inputPath = $video.FullName
    $outputPath = Join-Path $videoDir "$($video.BaseName)_compressed.mp4"
    $backupPath = Join-Path $videoDir "$($video.BaseName)_original.mp4"
    
    Write-Host "Compressing: $($video.Name)" -ForegroundColor Yellow
    Write-Host "  Original size: $([math]::Round($video.Length / 1MB, 2)) MB"
    
    # Backup original
    if (-not (Test-Path $backupPath)) {
        Copy-Item -Path $inputPath -Destination $backupPath
        Write-Host "  Backup created: $($video.BaseName)_original.mp4" -ForegroundColor Gray
    }
    
    # Compress with FFmpeg
    $ffmpegArgs = @(
        "-i", $inputPath,
        "-vcodec", "h264",
        "-crf", "28",
        "-preset", "medium",
        "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
        "-movflags", "+faststart",
        "-y",
        $outputPath
    )
    
    & $ffmpegPath $ffmpegArgs 2>&1 | Out-Null
    
    if (Test-Path $outputPath) {
        $compressedSize = (Get-Item $outputPath).Length
        Write-Host "  Compressed size: $([math]::Round($compressedSize / 1MB, 2)) MB" -ForegroundColor Green
        
        # Replace original with compressed
        Remove-Item -Path $inputPath
        Rename-Item -Path $outputPath -NewName $video.Name
        Write-Host "  ✓ Compression complete!" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ Compression failed!" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "=== Compression Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Refresh your browser (Ctrl + F5)" -ForegroundColor White
Write-Host "2. Test the gallery videos - they should now play smoothly!" -ForegroundColor White
Write-Host ""
Write-Host "Original files backed up as: *_original.mp4" -ForegroundColor Gray
