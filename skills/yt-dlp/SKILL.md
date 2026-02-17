---
name: yt-dlp
description: Feature-rich command-line audio/video downloader supporting thousands of sites. Use when users want to: (1) Download videos from URLs (YouTube, Twitter, etc.), (2) Extract audio/MP3 from video sources, (3) Download entire playlists, (4) Get video metadata or information from media links, (5) Extract subtitles/captions from videos.
---

# yt-dlp Video Downloader

A feature-rich command-line audio/video downloader supporting YouTube, Twitter, TikTok, and thousands of other sites.

## Overview

This skill provides atomic functions for video/audio downloading using yt-dlp. Supports single videos, playlists, metadata extraction, and audio conversion to MP3.

## Capabilities

### 1. download_video (Download Single Video)

**Function**: Download a single video with optional quality and format selection.

**Parameters**:
- `url` (string, required): Video URL
- `output_dir` (string, required): Absolute path to output directory
- `quality` (string, optional): Video quality selector
  - `best` (default): Best available quality
  - `1080p`, `720p`, `480p`, `360p`: Specific resolution
  - `worst`: Lowest quality
- `format` (string, optional): Output format
  - `mp4` (default)
  - `webm`
  - `mkv`

**Returns**:
```json
{
  "success": true,
  "output_file": "/path/to/video.mp4",
  "title": "Video Title",
  "duration": 180
}
```

**Example**:
```bash
python /path/to/yt-dlp/scripts/download.py \
  --url "https://www.youtube.com/watch?v=example" \
  --output-dir "/d/Videos" \
  --quality "1080p" \
  --format "mp4"
```

---

### 2. extract_audio (Extract Audio as MP3)

**Function**: Extract audio from video and convert to MP3 format.

**Parameters**:
- `url` (string, required): Video URL
- `output_dir` (string, required): Absolute path to output directory
- `audio_quality` (string, optional): Audio quality
  - `best` (default): Best available
  - `320`, `256`, `192`, `128`: Bitrate in kbps

**Returns**:
```json
{
  "success": true,
  "output_file": "/path/to/audio.mp3",
  "title": "Audio Title"
}
```

**Example**:
```bash
python /path/to/yt-dlp/scripts/download.py \
  --url "https://www.youtube.com/watch?v=example" \
  --output-dir "/d/Music" \
  --audio \
  --audio-quality "320"
```

---

### 3. download_playlist (Download Playlist)

**Function**: Download all videos in a playlist.

**Parameters**:
- `url` (string, required): Playlist URL
- `output_dir` (string, required): Absolute path to output directory
- `quality` (string, optional): Same as download_video (default: best)
- `format` (string, optional): Same as download_video (default: mp4)
- `start_index` (int, optional): Start from video number (default: 1)
- `end_index` (int, optional): Stop at video number (default: all)

**Returns**:
```json
{
  "success": true,
  "total_videos": 25,
  "downloaded": 25,
  "failed": 0,
  "output_dir": "/path/to/playlist"
}
```

**Example**:
```bash
python /path/to/yt-dlp/scripts/download.py \
  --url "https://www.youtube.com/playlist?list=example" \
  --output-dir "/d/Playlists/MyPlaylist" \
  --playlist \
  --quality "720p"
```

---

### 4. get_metadata (Get Video Information)

**Function**: Retrieve video metadata without downloading.

**Parameters**:
- `url` (string, required): Video URL

**Returns**:
```json
{
  "success": true,
  "title": "Video Title",
  "uploader": "Channel Name",
  "duration": 180,
  "view_count": 1000000,
  "upload_date": "20240101",
  "thumbnail": "https://...",
  "formats": ["1080p", "720p", "480p"]
}
```

**Example**:
```bash
python /path/to/yt-dlp/scripts/download.py \
  --url "https://www.youtube.com/watch?v=example" \
  --info-only
```

---

### 5. extract_subtitles (Extract Subtitles/Captions)

**Function**: Extract subtitles or captions from video without downloading the video file.

**Parameters**:
- `url` (string, required): Video URL
- `output_dir` (string, required): Absolute path to output directory
- `subtitle_lang` (string, optional): Subtitle language code
  - `zh-Hans` (default): 简体中文（Simplified Chinese）
  - `en`: English
  - `zh-Hant`: 繁体中文
  - `ja`, `es`, `fr`: Other language codes
  - `auto`: Download all available subtitles
- `subtitle_format` (string, optional): Output format
  - `srt` (default): SubRip format
  - `vtt`: WebVTT format
  - `ass`: Advanced SubStation Alpha format

**Default Behavior**:
- **Proxy**: Uses `http://127.0.0.1:7897` proxy by default
- **Language**: Defaults to simplified Chinese (`zh-Hans`) subtitles for better Chinese content understanding

**Returns**:
```json
{
  "success": true,
  "subtitle_files": ["/path/to/subtitle1.srt", "/path/to/subtitle2.vtt"],
  "title": "Video Title",
  "subtitle_lang": "en",
  "subtitle_format": "srt"
}
```

**Example**:
```bash
# Extract Simplified Chinese subtitles (default behavior)
python /d/DevSource/.shared-skills/yt-dlp/scripts/download.py \
  --url "https://www.youtube.com/watch?v=example" \
  --output-dir "/d/Subtitles" \
  --subtitles

# Extract English subtitles (override default)
python /d/DevSource/.shared-skills/yt-dlp/scripts/download.py \
  --url "https://www.youtube.com/watch?v=example" \
  --output-dir "/d/Subtitles" \
  --subtitles \
  --subtitle-lang "en"
  --subtitle-format "srt"

# Extract with custom proxy (if network requires)
python /d/DevSource/.shared-skills/yt-dlp/scripts/download.py \
  --url "https://www.youtube.com/watch?v=example" \
  --output-dir "/d/Subtitles" \
  --subtitles \
  --proxy "http://custom-proxy:port"
```

---
 
## Default Behavior

**Proxy Configuration**:
- Automatically uses `http://127.0.0.1:7897` proxy by default
- Configure alternative proxy via environment variables or modify the script
- To disable proxy, set environment variable: `export HTTP_PROXY=`

**Subtitle Language**:
- Defaults to simplified Chinese (`zh-Hans`) for better Chinese content understanding
- Override with `--subtitle-lang en` for English or other languages
- Available languages: `zh-Hans` (简体), `zh-Hant` (繁体), `en` (English), `ja` (Japanese), `auto` (all available)

---

## Technical Implementation

- **Engine**: yt-dlp (Python library)
- **Dependencies**: See requirements.txt
- **Supported Formats**: MP4, WebM, MKV, MP3 (audio extraction)
- **Platform Support**: Cross-platform (Windows, macOS, Linux)

### Installation

The skill requires yt-dlp to be installed:

```bash
pip install yt-dlp
```

**Optional dependencies** for enhanced functionality:
- `ffmpeg`: Required for merging video/audio streams and format conversion
- `yt-dlp-ejs`: Required for some YouTube signature deciphering

## Usage Workflow

1. **Single video download**:
   - User provides URL → Call `download_video` with quality/format options
   - Script handles download and reports output file path

2. **Audio extraction**:
   - User wants MP3 → Call `extract_audio` with URL and quality
   - Script downloads video, extracts audio, converts to MP3

3. **Playlist download**:
   - User provides playlist URL → Call `download_playlist`
   - Script iterates through playlist, downloads each video
   - Reports progress and summary

4. **Metadata only**:
   - User wants video info → Call `get_metadata`
   - Script extracts and returns metadata without downloading

5. **Subtitle extraction**:
   - User wants text/captions → Call `extract_subtitles` with language
   - Script extracts available subtitles without downloading video
   - Returns paths to subtitle files

## Notes

- Always use absolute paths for `output_dir`
- yt-dlp automatically handles retries and resume for interrupted downloads
- For large files, download progress is displayed
- Some sites may require additional dependencies (see yt-dlp documentation)
