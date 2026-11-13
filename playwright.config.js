import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({
  testDir: './web/e2e', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:8766', viewport: { width: 1440, height: 1000 },
    launchOptions: existsSync(chrome) ? { executablePath: chrome } : {}, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'python app/server.py --port 8766 --data-path .local/browser-test.sqlite3', url: 'http://127.0.0.1:8766/api/health', timeout: 15000 },
});
