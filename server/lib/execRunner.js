import { exec } from 'child_process';
import db from './db.js';

// Runs whatever command text is given directly on the laptop, as the
// account the server process runs under. No sandboxing, no allowlist, no
// confirmation step by design (per explicit user request) — treat every
// device with the app PIN (and, now, the local chat assistant) as having
// full control of this machine. Every call is logged to command_log.
export function runCommand(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 30000, maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
      const finalStderr = stderr || (error && !stdout ? error.message : '');
      db.prepare('INSERT INTO command_log (command, stdout, stderr, exit_code) VALUES (?, ?, ?, ?)')
        .run(command, stdout || '', finalStderr, exitCode);
      resolve({
        stdout: stdout || '',
        stderr: finalStderr,
        exitCode,
        timedOut: !!(error?.killed && error?.signal === 'SIGTERM'),
      });
    });
  });
}
