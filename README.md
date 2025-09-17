# Google Classroom MCP Server

An advanced MCP (Model Context Protocol) server that provides comprehensive access to Google Classroom data through Claude and other AI assistants that support the MCP protocol.

## ✨ Features

- **📚 Course Management**: List, get details, and manage courses
- **📝 Assignment Operations**: View, create, and manage coursework (requires teacher permissions for creation)
- **👥 Student Management**: Access student rosters and submissions
- **📢 Announcements**: View course announcements
- **🔐 Secure Authentication**: OAuth 2.0 with environment variable storage
- **🔄 Backward Compatibility**: Supports both new and legacy authentication methods
- **🛠️ TypeScript**: Full TypeScript implementation with type safety

## 🎯 Available Tools

### Core Tools (Enhanced)
- `list_courses` - List all courses with advanced filtering
- `get_course` - Get detailed course information
- `list_coursework` - List assignments and coursework
- `get_coursework` - Get specific assignment details
- `list_students` - List enrolled students
- `list_submissions` - View student submissions
- `list_announcements` - View course announcements
- `create_coursework` - **NEW**: Create assignments (teacher permissions required)

### Legacy Tools (Backward Compatibility)
- `courses` - List courses (legacy)
- `course-details` - Get course details (legacy)
- `assignments` - Get assignments (legacy)

## 📋 Prerequisites

- Node.js (v16 or higher)
- A Google Cloud Platform project with the Google Classroom API enabled
- OAuth 2.0 client credentials for the Google Classroom API

## 🚀 Quick Installation

### For Claude Desktop (Automated)
```bash
npx -y @smithery/cli install @faizan45640/google-classroom-mcp-server --client claude
```

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/faizan45640/google-classroom-mcp-server.git
cd google-classroom-mcp-server

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## 🔧 Authentication Setup

### Step 1: Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Classroom API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Classroom API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Choose "**Desktop application**" as the application type
4. Download the credentials JSON file
5. Save it as `credentials.json` in the project root directory

### Step 3: Run Authentication Setup

```bash
# New method (recommended)
npm run setup-auth

# Legacy method (still supported)
npm run auth
```

This will:
- Open a browser window for Google OAuth
- Ask you to grant necessary permissions
- Save authentication tokens securely

## 🏃‍♂️ Running the Server

```bash
# Build and start
npm run build
npm start

# Development mode
npm run dev

# Test the server
npm test
```

## 🔗 Claude Desktop Configuration

### Windows
Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-classroom": {
      "command": "node",
      "args": ["C:/path/to/your/google-classroom-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

### macOS/Linux
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

**💡 Tip**: Copy the environment variables from the `.env` file created during authentication setup.

## 🧪 Testing the Server

### 1. Basic Connection Test
```bash
npm test
```

### 2. Manual Testing
After running the server, you should see:
```
Google Classroom MCP server running on stdio
✅ Authenticated via environment variables
```

### 3. Integration Testing with Claude

Once configured in Claude Desktop, test with these example prompts:

#### Basic Queries
- "List all my Google Classroom courses"
- "Show me details for my Math course"
- "What assignments do I have in my History class?"

#### Advanced Queries  
- "Show me all students in course ID 123456789"
- "List submissions for assignment ID 987654321 in course 123456789"
- "Create a new assignment called 'Chapter 5 Quiz' in my Math course"

#### Legacy Compatibility
- "Use the 'courses' tool to show my classes" (tests backward compatibility)

## 🛠️ Development

### Project Structure
```
google-classroom-mcp-server/
├── src/
│   ├── index.ts          # Main server implementation
│   └── setup-auth.ts     # Authentication setup
├── dist/                 # Compiled JavaScript output
├── credentials.json      # Google OAuth credentials (not in git)
├── .env                  # Environment variables (not in git)
├── tokens.json          # Legacy token storage (not in git)
├── package.json         # Project configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

### Available Scripts
```bash
npm run build       # Compile TypeScript to JavaScript
npm run start       # Run the compiled server
npm run dev         # Build and run in development mode
npm run setup-auth  # Run authentication setup
npm run clean       # Remove compiled files
npm run test        # Test the server connection
npm run auth        # Legacy authentication command
```

### Building from Source
```bash
# Install dependencies
npm install

# Install TypeScript globally (if needed)
npm install -g typescript

# Build the project
npm run build

# Run the server
npm start
```

## 🔒 Security Notes

- **Environment Variables**: The server uses `.env` file for secure credential storage
- **Legacy Support**: `tokens.json` is maintained for backward compatibility
- **Git Ignore**: Sensitive files (`.env`, `credentials.json`, `tokens.json`) are excluded from version control
- **Scoped Access**: Only requests necessary Google Classroom permissions
- **Token Refresh**: Automatically handles token refresh

## 🆕 What's New in v1.0.0

### New Features
- ✨ **TypeScript Implementation**: Full type safety and better development experience
- 🔧 **Create Assignments**: Teachers can now create coursework programmatically
- 👥 **Student Management**: List students and view their submissions
- 🔐 **Enhanced Security**: Environment variable-based authentication
- 📊 **Advanced Filtering**: More options for filtering courses and assignments

### Improvements
- 🔄 **Backward Compatibility**: All legacy tools (`courses`, `course-details`, `assignments`) still work
- 🏗️ **Better Architecture**: Proper project structure with TypeScript
- 📝 **Enhanced Documentation**: Comprehensive setup and testing instructions
- 🛠️ **Developer Experience**: Better error messages and logging

### Breaking Changes
- **Build Step Required**: Now requires `npm run build` before running
- **New Config Format**: Claude Desktop config should use `dist/index.js` path

## 🔄 Migration Guide

### From Legacy Version
If you're upgrading from the old JavaScript version:

1. **Backup your tokens**:
   ```bash
   cp tokens.json tokens.json.backup
   ```

2. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

3. **Install new dependencies**:
   ```bash
   npm install
   ```

4. **Build the TypeScript code**:
   ```bash
   npm run build
   ```

5. **Update Claude Desktop config**:
   - Change `index.js` to `dist/index.js` in your config
   - Optionally run `npm run setup-auth` for enhanced security

6. **Test the upgrade**:
   ```bash
   npm test
   ```

## 🐛 Troubleshooting

### Authentication Issues
```bash
# Re-run authentication setup
npm run setup-auth

# Or use legacy method
npm run auth

# Check if tokens exist
ls -la tokens.json .env
```

### Build Issues
```bash
# Clean and rebuild
npm run clean
npm run build

# Check TypeScript installation
npx tsc --version
```

### Permission Errors
- Ensure your Google account has appropriate access to the courses
- For creating assignments, you need teacher permissions
- Verify your app is approved if using restricted scopes

### Claude Desktop Connection Issues
- Check that the path in `claude_desktop_config.json` points to `dist/index.js`
- Restart Claude Desktop after configuration changes
- Verify environment variables are correctly set

## 📚 API Reference

### Course Management
- `list_courses(courseStates?, teacherId?, studentId?)` - List courses with filtering
- `get_course(courseId)` - Get detailed course information

### Coursework & Assignments
- `list_coursework(courseId, courseWorkStates?)` - List assignments in a course
- `get_coursework(courseId, courseWorkId)` - Get specific assignment details
- `create_coursework(courseId, title, description?, dueDate?, maxPoints?, workType?)` - Create new assignment

### Students & Submissions
- `list_students(courseId)` - List enrolled students
- `list_submissions(courseId, courseWorkId, userId?)` - View student submissions

### Communication
- `list_announcements(courseId, announcementStates?)` - View course announcements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Build and test: `npm run build && npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- Uses Google's [Classroom API](https://developers.google.com/classroom)
- TypeScript implementation for enhanced developer experience

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/faizan45640/google-classroom-mcp-server/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/faizan45640/google-classroom-mcp-server/discussions)
- 📖 **Documentation**: See this README and inline code comments