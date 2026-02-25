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

async function setupAuthentication() {
  console.log('Google Classroom MCP Server Authentication Setup');
  console.log('==================================================\n');

  // Check if credentials file exists
  const credentialsPath = path.join(process.cwd(), 'credentials.json');
  if (!fs.existsSync(credentialsPath)) {
    console.error('credentials.json not found!');
    console.log('\nTo set up authentication:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select an existing one');
    console.log('3. Enable the Google Classroom API');
    console.log('4. Go to "Credentials" and create an OAuth 2.0 Client ID');
    console.log('5. Choose "Desktop application" as the application type');
    console.log('6. Download the credentials and save as "credentials.json" in this directory');
    console.log('7. Run this setup script again\n');
    process.exit(1);
  }

  // Load credentials
  const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
  const credentials = JSON.parse(credentialsContent);
  
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  
  if (!client_id || !client_secret) {
    console.error('Invalid credentials.json format');
    console.error('Make sure you downloaded the correct OAuth 2.0 Client ID credentials');
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

  console.log('Please visit this URL to authorize the application:');
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
      console.error('No refresh token received. Please try again and make sure to grant all permissions.');
      process.exit(1);
    }

    // Save tokens to .env file (new method)
    const envContent = `# Google Classroom MCP Server Environment Variables
# Generated on ${new Date().toISOString()}
GOOGLE_CLIENT_ID="${client_id}"
GOOGLE_CLIENT_SECRET="${client_secret}"
GOOGLE_REDIRECT_URI="${redirect_uris[0] || 'urn:ietf:wg:oauth:2.0:oob'}"
GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"
`;

    fs.writeFileSync('.env', envContent);
    
    // Also save to legacy tokens.json for backward compatibility
    const tokensForLegacy = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date
    };
    
    fs.writeFileSync('tokens.json', JSON.stringify(tokensForLegacy, null, 2));
    
    console.log('Authentication successful!');
    console.log('Tokens saved to .env file (secure)');
    console.log('Legacy tokens.json also created for backward compatibility');
    console.log('\nYou can now run the MCP server with:');
    console.log('   npm run build && npm start');
    console.log('\nOr test it with:');
    console.log('   npm test');
    console.log('\nAdd to Claude Desktop config:');
    console.log('   See README.md for configuration instructions');

  } catch (error) {
    console.error('Error getting tokens:', error);
    process.exit(1);
  }
}

setupAuthentication().catch(console.error);