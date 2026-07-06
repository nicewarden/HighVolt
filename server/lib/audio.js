import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';

// Normalizes any uploaded input audio (whatever format a phone/recorder
// produced - m4a, webm, mp4, etc.) into a small mono 64kbps MP3, which
// Gemini's API officially supports and which keeps file size predictable
// and small for speech (a 30-minute recording is only ~14MB).
export function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      ['-y', '-i', inputPath, '-ar', '44100', '-ac', '1', '-b:a', '64k', outputPath],
      { timeout: 5 * 60 * 1000, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(`ffmpeg conversion failed: ${stderr || error.message}`));
        resolve(outputPath);
      }
    );
  });
}

// No ffprobe bundled with ffmpeg-static, so we read the duration line ffmpeg
// itself prints to stderr when given no output.
export function getAudioDurationSeconds(inputPath) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, ['-i', inputPath], { timeout: 30 * 1000, windowsHide: true }, (error, stdout, stderr) => {
      const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr || '');
      if (!match) return reject(new Error('Could not determine audio duration.'));
      const [, hh, mm, ss] = match;
      resolve(Number(hh) * 3600 + Number(mm) * 60 + Number(ss));
    });
  });
}

// Splits an audio file into consecutive, independently-playable chunks of
// about segmentSeconds each (stream-copied, so this is fast and lossless).
// Used to keep each recording under Gemini's inline request size limit.
export function splitAudioBySegmentTime(inputPath, ext, segmentSeconds) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(inputPath);
    const base = path.basename(inputPath, path.extname(inputPath));
    const pattern = path.join(dir, `${base}-part%03d${ext}`);
    execFile(
      ffmpegPath,
      ['-y', '-i', inputPath, '-f', 'segment', '-segment_time', String(segmentSeconds), '-c', 'copy', pattern],
      { timeout: 5 * 60 * 1000, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(`ffmpeg split failed: ${stderr || error.message}`));
        const files = fs.readdirSync(dir)
          .filter(f => f.startsWith(`${base}-part`) && f.endsWith(ext))
          .sort()
          .map(f => path.join(dir, f));
        resolve(files);
      }
    );
  });
}
