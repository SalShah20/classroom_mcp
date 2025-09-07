# Google Classroom MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to Google Classroom data and functionality.

## Features

- **Course Management**: List and get details about courses
- **Assignments**: View, create, and manage coursework
- **Student Management**: Access student rosters and submissions
- **Announcements**: View course announcements
- **Submissions**: Track and review student submissions

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Classroom API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Classroom API"
   - Click "Enable"

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Choose "Desktop application" as the application type
4. Download the credentials JSON file
5. Save it as `credentials.json` in the project root directory

### 4. Authentication Setup

Run the authentication setup script:

```bash
npm run setup-auth
```

This will:
- Open a browser window for Google OAuth
- Ask you to grant necessary permissions
- Save the authentication tokens to a `.env` file

### 5. Build the Server

```bash
npm run build
```

### 6. Test the Server

```bash
npm start
```

## Configuration for Claude Desktop

Add this to your Claude Desktop configuration file:

**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-classroom": {
      "command": "node",
      "args": ["/path/to/your/google-classroom-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret", 
        "GOOGLE_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

You can copy the environment variables from the `.env` file created during setup.

## Available Tools

### Course Management
- `list_courses` - List all accessible courses
- `get_course` - Get detailed course information

### Coursework & Assignments  
- `list_coursework` - List assignments in a course
- `get_coursework` - Get assignment details
- `create_coursework` - Create new assignments

### Students & Submissions
- `list_students` - List enrolled students
- `list_submissions` - View student submissions

### Communication
- `list_announcements` - View course announcements

## Example Usage

Once connected to Claude Desktop, you can ask questions like:

- "List all my active courses"
- "Show me the assignments for my Math 101 course"
- "Create a new assignment about fractions due next Friday"
- "Who are the students in my English class?"
- "Show me submissions for the latest essay assignment"

## Troubleshooting

### Authentication Issues
- Make sure you've enabled the Google Classroom API in Google Cloud Console
- Verify your `credentials.json` file is valid
- Re-run `npm run setup-auth` if tokens expire

### Permission Errors
- Ensure you have appropriate access to the courses you're trying to access
- Some operations require teacher permissions

### API Rate Limits
The server handles basic rate limiting, but for heavy usage consider implementing additional throttling.

## Security Notes

- Keep your `credentials.json` and `.env` files secure and never commit them to version control
- The refresh token provides ongoing access to your Google Classroom data
- Only grant access to trusted AI assistants

## Contributing

Feel free to submit issues and pull requests to improve the server functionality.

## License

MIT License