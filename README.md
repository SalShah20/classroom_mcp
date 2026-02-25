# Google Classroom MCP Server

An MCP (Model Context Protocol) server that connects Claude to Google Classroom, letting you query courses, assignments, grades, and more through natural language.

## Available Tools

### Student tools

| Tool | Description |
|---|---|
| `list_courses` | List all your courses with optional filtering |
| `get_course` | Get detailed info about a specific course |
| `get_assignments` | Get all published assignments in a course |
| `get_coursework` | Get details for a specific assignment |
| `get_assignment_materials` | Get Drive files, links, videos, and forms attached to an assignment |
| `get_upcoming_assignments` | Assignments due in the next N days (default: 7) across all active courses |
| `get_missing_assignments` | Past-due assignments you haven't submitted |
| `get_submission_feedback` | Your grade and feedback for a specific assignment |
| `get_grades` | Your grades across all active courses |
| `calculate_grade` | Your overall grade percentage for a course |
| `list_announcements` | View announcements for a course |

### Teacher tools

| Tool | Description |
|---|---|
| `list_courses` | List all courses (filter by teacherId to see only yours) |
| `get_course` | Get detailed info about a specific course |
| `list_coursework` | List assignments in a course (supports state filtering) |
| `get_coursework` | Get details for a specific assignment |
| `create_coursework` | Create a new assignment with title, description, due date, and points |
| `list_students` | List students enrolled in a course |
| `list_submissions` | View all student submissions for an assignment |
| `list_announcements` | View announcements for a course |

---

## Setup

### Prerequisites

- Node.js v16 or higher
- A Google Cloud project with the Classroom API enabled

### Step 1 — Clone and install

```bash
git clone https://github.com/SalShah20/classroom_mcp.git
cd classroom_mcp
npm install
npm run build
```

### Step 2 — Create a Google Cloud project and enable the Classroom API

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. In the left menu, go to **APIs & Services → Library**
4. Search for **Google Classroom API** and click **Enable**

### Step 3 — Create OAuth 2.0 credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. If prompted, configure the OAuth consent screen first:
   - Set User Type to **External**
   - Fill in an app name (anything works, e.g. "Classroom MCP")
   - Add your Google account email as a test user
4. Back on the credentials page, choose **Desktop app** as the application type
5. Click **Create**, then **Download JSON**
6. Rename the downloaded file to `credentials.json` and place it in the project root folder

### Step 4 — Authenticate

```bash
npm run setup-auth
```

This will:
1. Read your `credentials.json`
2. Print a URL — **copy it and open it in your browser**
3. Sign in with your Google account and click **Allow**
4. Google will show you an authorization code — **copy it**
5. Paste the code back into the terminal and press Enter

On success, a `.env` file is created in the project root containing your credentials. You'll need these values in the next step.

> **No refresh token received?** This can happen if you've authorized the app before. Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions), remove the app's access, then run `npm run setup-auth` again.

### Step 5 — Add the server to Claude Desktop

Open your Claude Desktop config file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the following entry (update the path and credential values):

```json
{
  "mcpServers": {
    "google-classroom": {
      "command": "node",
      "args": ["C:/path/to/classroom_mcp/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

To find your values, open the `.env` file created in Step 4 — it contains all three values with the matching names.

**Restart Claude Desktop** after saving the config.

---

## Verifying it works

Once Claude Desktop is restarted, try asking Claude:

**Students:**
- "List all my Google Classroom courses"
- "What assignments do I have coming up this week?"
- "Do I have any missing assignments?"
- "Show me my grades for my [course name] class"
- "What's my overall grade percentage in [course name]?"
- "What materials are attached to the [assignment name] assignment?"
- "Did my teacher leave any feedback on my last submission?"

**Teachers:**
- "Show me the students in my [course name] course"
- "List all submissions for the [assignment name] assignment"
- "Create a new assignment called 'Chapter 5 Quiz' in my [course name] course due 2026-03-15 worth 100 points"

---

## Running locally (without Claude Desktop)

```bash
# Build
npm run build

# Run the server directly (reads credentials from .env automatically)
npm start
```

---

## Project structure

```
classroom_mcp/
├── src/
│   ├── index.ts          # Main server — all tools are defined here
│   └── setup-auth.ts     # Interactive authentication setup
├── dist/                 # Compiled output (generated by npm run build)
├── credentials.json      # Your Google OAuth credentials (not committed to git)
├── .env                  # Your tokens after running setup-auth (not committed to git)
├── tokens.json           # Legacy token file for backward compatibility (not committed to git)
├── package.json
├── tsconfig.json
└── README.md
```

---

## API Reference

### Courses
- `list_courses(courseStates?, teacherId?, studentId?)` — list courses, optionally filtered by state (ACTIVE, ARCHIVED, etc.)
- `get_course(courseId)` — get full details for one course

### Assignments (Student)
- `get_assignments(courseId)` — list all published assignments in a course with title, due date, max points, and type
- `get_coursework(courseId, courseWorkId)` — get full details for a specific assignment
- `get_assignment_materials(courseId, courseWorkId)` — get all attached materials (Drive files, links, YouTube videos, Google Forms)
- `get_upcoming_assignments(days?)` — assignments due within the next `days` days across all active courses, sorted by due date. Defaults to 7 days
- `get_missing_assignments()` — past-due assignments with no submission across all active courses

### Assignments (Teacher)
- `list_coursework(courseId, courseWorkStates?)` — list assignments in a course, optionally filtered by state (PUBLISHED, DRAFT, DELETED)
- `create_coursework(courseId, title, description?, dueDate?, dueTime?, maxPoints?, workType?)` — create an assignment
  - `dueDate` format: `"YYYY-MM-DD"` e.g. `"2026-03-15"`
  - `dueTime` format: `"HH:MM"` (24-hour) e.g. `"23:59"`
  - `maxPoints`: positive number e.g. `100`
  - `workType`: `"ASSIGNMENT"` | `"SHORT_ANSWER_QUESTION"` | `"MULTIPLE_CHOICE_QUESTION"` (default: `"ASSIGNMENT"`)

### Grades & Submissions
- `get_grades()` — your grade for every assignment across all active courses, including `assignedGrade`, `maxPoints`, `state`, and `dueDate`
- `get_submission_feedback(courseId, courseWorkId)` — your grade, draft grade, late status, and feedback for a specific assignment
- `calculate_grade(courseId)` — overall grade percentage for a course plus a per-assignment breakdown
- `list_submissions(courseId, courseWorkId, userId?)` — list all raw submission objects for an assignment (teacher use)

### Students & Announcements
- `list_students(courseId)` — list enrolled students
- `list_announcements(courseId, announcementStates?)` — list announcements

---

## Troubleshooting

**`credentials.json not found`**
Make sure the file is in the project root (same folder as `package.json`), not in a subfolder.

**`No refresh token received`**
Revoke the app's existing access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions), then re-run `npm run setup-auth`.

**`Google Classroom API not initialized`**
The server couldn't find credentials. Make sure the `env` block in your Claude Desktop config has all three values (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`).

**Server not appearing in Claude Desktop**
- Check that the file path in `args` points to `dist/index.js` and uses the correct absolute path
- Make sure you ran `npm run build` so `dist/index.js` exists
- Restart Claude Desktop fully after editing the config

**Build errors**
```bash
npm run clean
npm install
npm run build
```
---

## Security notes

- The server only requests the minimum Classroom API scopes needed
- Access tokens are refreshed automatically using the stored refresh token

---


