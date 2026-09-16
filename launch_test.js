const { spawn } = require('child_process');
const path = require('path');

const electronPath = require('electron');
const appPath = __dirname;

console.log('Spawning Electron...');
const child = spawn(electronPath, [appPath], {
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
});

child.stdout.on('data', (data) => {
  console.log(`[STDOUT]: ${data.toString().trim()}`);
});

child.stderr.on('data', (data) => {
  console.error(`[STDERR]: ${data.toString().trim()}`);
});

child.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
});
