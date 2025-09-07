#!/usr/bin/env node

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
];

interface Credentials {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

async function setupAuthentication() {
  console.log('Google Classroom MCP Server Authentication Setup');
  console.log('==============================================\n');

  // Check if credentials file exists
  const credentialsPath = path.join(process.cwd(), 'credentials.json');
  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ credentials.json not found!');
    console.log('\nTo set up authentication:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select an existing one');
    console.log('3. Enable the Google Classroom API');
    console.log('4. Go to "Credentials" and create an OAuth 2.0 Client ID');
    console.log('5. Download the credentials and save as "credentials.json" in this directory');
    console.log('6. Run this setup script again\n');
    process.exit(1);
  }

  // Load credentials
  const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
  const credentials = JSON.parse(credentialsContent);
  
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  
  if (!client_id || !client_secret) {
    console.error('❌ Invalid credentials.json format');
    process.exit(1);
  }

  // Create OAuth2 client
  const oauth2Client = new OAuth2Client(
    client_id,
    client_secret,
    redirect_uris[0] || 'urn:ietf:wg:oauth:2.0:oob'
  );

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  });

  console.log('🔐 Please visit this URL to authorize the application:');
  console.log(`\n${authUrl}\n`);

  // Get authorization code from user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) => {
    rl.question('Enter the authorization code: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.error('❌ No refresh token received. Please try again and make sure to grant all permissions.');
      process.exit(1);
    }

    // Save tokens to .env file
    const envContent = `# Google Classroom MCP Server Environment Variables
GOOGLE_CLIENT_ID="${client_id}"
GOOGLE_CLIENT_SECRET="${client_secret}"
GOOGLE_REDIRECT_URI="${redirect_uris[0] || 'urn:ietf:wg:oauth:2.0:oob'}"
GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"
`;

    fs.writeFileSync('.env', envContent);
    
    console.log('✅ Authentication successful!');
    console.log('🔑 Tokens saved to .env file');
    console.log('\nYou can now run the MCP server with:');
    console.log('npm run build && node dist/index.js');
    console.log('\nOr add it to your Claude Desktop configuration.');

  } catch (error) {
    console.error('❌ Error getting tokens:', error);
    process.exit(1);
  }
}

setupAuthentication().catch(console.error);