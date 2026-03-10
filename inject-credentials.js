#!/usr/bin/env node

// Reads credentials from .env and injects them into the compiled dist/index.js
// Runs as part of "prepublishOnly" so secrets end up in the npm package
// but never in the git source code.

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env file not found. Cannot inject credentials.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const match = trimmed.match(/^(\w+)\s*=\s*"?([^"]*)"?$/);
  if (match) env[match[1]] = match[2];
}

const clientId = env.GOOGLE_CLIENT_ID;
const clientSecret = env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

// Replace placeholders in dist/index.js
const distPath = path.join(__dirname, 'dist', 'index.js');
if (!fs.existsSync(distPath)) {
  console.error('ERROR: dist/index.js not found. Run "npm run build" first.');
  process.exit(1);
}

let content = fs.readFileSync(distPath, 'utf8');
content = content.replace('__GOOGLE_CLIENT_ID__', clientId);
content = content.replace('__GOOGLE_CLIENT_SECRET__', clientSecret);

// Verify placeholders were replaced
if (content.includes('__GOOGLE_CLIENT_ID__') || content.includes('__GOOGLE_CLIENT_SECRET__')) {
  console.error('ERROR: Failed to replace all placeholders.');
  process.exit(1);
}

fs.writeFileSync(distPath, content);
console.log('Credentials injected into dist/index.js successfully.');
