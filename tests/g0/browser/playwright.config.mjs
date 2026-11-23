import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  timeout: 25_000,
  expect: {timeout: 12_000},
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3098',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    serviceWorkers: 'block',
  },
  projects: [
    {name: 'android-chromium', use: {...devices['Pixel 7'], browserName: 'chromium'}},
    {name: 'ios-webkit', use: {...devices['iPhone 13'], browserName: 'webkit'}},
    {name: 'desktop-chromium', use: {browserName: 'chromium', viewport: {width: 1440, height: 900}}},
  ],
  webServer: {
    command: 'npm run start -- -p 3098',
    port: 3098,
    reuseExistingServer: false,
    timeout: 65_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
