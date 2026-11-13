"""Explicit, fast-forward-only updates from the user's repository. Never reset local work."""
import os
import subprocess
import threading

REMOTE = "https://github.com/AbhishekKhond005/CHESSNITE.git"


class Updater:
    def __init__(self, root):
        self.root = root
        self.lock = threading.Lock()
        self.state = {"status": "idle", "message": "Updates come from your CHESSNITE GitHub repository."}

    def git(self, *args):
        result = subprocess.run(['git', '-c', f'safe.directory={self.root}', '-C', str(self.root), *args],
                                capture_output=True, text=True, timeout=90,
                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        if result.returncode:
            raise RuntimeError((result.stderr or result.stdout).strip() or 'Git could not complete the update.')
        return result.stdout.strip()

    def read(self):
        with self.lock:
            return dict(self.state)

    def start(self):
        with self.lock:
            if self.state['status'] == 'updating':
                return dict(self.state)
            self.state = {"status": "updating", "message": "Checking GitHub and downloading the latest version…"}
        threading.Thread(target=self.run, daemon=True).start()
        return self.read()

    def run(self):
        try:
            if self.git('remote', 'get-url', 'origin').rstrip('/').lower() != REMOTE.lower():
                raise RuntimeError('The origin remote is not your configured CHESSNITE repository. No files were changed.')
            if self.git('branch', '--show-current') != 'main':
                raise RuntimeError('Switch this checkout to main before updating the app.')
            if self.git('status', '--porcelain', '--untracked-files=no'):
                raise RuntimeError('Local source files have changes. Commit or move those changes before updating. Your progress is safe.')
            self.git('fetch', 'origin', 'main')
            before, after = self.git('rev-parse', 'HEAD'), self.git('rev-parse', 'origin/main')
            if before == after:
                result = {"status": "current", "message": "You’re using the latest version.", "commit": before[:7]}
            else:
                self.git('merge', '--ff-only', 'origin/main')
                result = {"status": "updated", "message": "Update downloaded. Restart the app to finish. Your progress has been kept.", "commit": after[:7]}
        except (RuntimeError, OSError, subprocess.TimeoutExpired) as exc:
            result = {"status": "error", "message": str(exc)}
        with self.lock:
            self.state = result
