#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Google Classroom API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
];

class GoogleClassroomMCPServer {
  private server: Server;
  private auth: OAuth2Client | null = null;
  private classroom: any = null;

  constructor() {
    this.server = new Server(
      {
        name: 'google-classroom-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupAuth();
  }

  private async setupAuth() {
    try {
      // Initialize OAuth2 client
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
      );

      // Check if we have stored credentials
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.auth.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });
        
        // Initialize Classroom API
        this.classroom = google.classroom({ version: 'v1', auth: this.auth });
      } else {
        console.error('No refresh token found. Please run authentication setup first.');
      }
    } catch (error) {
      console.error('Authentication setup failed:', error);
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_courses',
            description: 'List all courses the user has access to',
            inputSchema: {
              type: 'object',
              properties: {
                courseStates: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by course states (ACTIVE, ARCHIVED, PROVISIONED, DECLINED, SUSPENDED)',
                },
                teacherId: {
                  type: 'string',
                  description: 'Filter courses by teacher ID',
                },
                studentId: {
                  type: 'string',
                  description: 'Filter courses by student ID',
                },
              },
            },
          },
          {
            name: 'get_course',
            description: 'Get detailed information about a specific course',
            inputSchema: {
              type: 'object',
              properties: {
                courseId: {
                  type: 'string',
                  description: 'The ID of the course to retrieve',
                },
              },
              required: ['courseId'],
            },
          },
          {
            name: 'list_coursework',
            description: 'List assignments and coursework for a course',
            inputSchema: {
              type: 'object',
              properties: {
                courseId: {
                  type: 'string',
                  description: 'The ID of the course',
                },
                courseWorkStates: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by coursework states (PUBLISHED, DRAFT, DELETED)',
                },
              },
              required: ['courseId'],
            },
          },
          {
            name: 'get_coursework',
            description: 'Get detailed information about a specific assignment',
            inputSchema: {
              type: 'object',
              properties: {
                courseId: {
                  type: 'string',
                  description: 'The ID of the course',
                },
                courseWorkId: {
                  type: 'string',
                  description: 'The ID of the coursework/assignment',
                },
              },
              required: ['courseId', 'courseWorkId'],
            },
          },
          {
            name: 'list_students',
            description: 'List students enrolled in a course',
            inputSchema: {
              type: 'object',
              properties: {
                courseId: {
                  type: 'string',
                  description: 'The ID of the course',
                },
              },
              required: ['courseId'],
            },
          },
          {
            name: 'list_submissions',
            description: 'List student submissions for an assignment',
            inputSchema: {
              type: 'object',
              properties: {
                courseId: {
                  type: 'string',
                  description: 'The ID of the course',
                },
                courseWorkId: {
                  type: 'string',
                  description: 'The ID of the coursework/assignment',
                },
                userId: {
                  type: 'string',
                  description: 'Filter by specific student ID (optional)',
                },
              },
              required: ['courseId', 'courseWorkId'],
            },
          },
          {
            name: 'list_announcements',
            description: 'List announcements for a course',
            inputSchema: {
              type: 'object',
              properties: {
                courseId: {
                  type: 'string',
                  description: 'The ID of the course',
                },
                announcementStates: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by announcement states (PUBLISHED, DRAFT, DELETED)',
                },
              },
              required: ['courseId'],
            },
          },
          {
            name: 'create_coursework',
            description: 'Create a new assignment in a course',
            inputSchema: {
              type: 'object',
              properties: {
                courseId: {
                  type: 'string',
                  description: 'The ID of the course',
                },
                title: {
                  type: 'string',
                  description: 'Title of the assignment',
                },
                description: {
                  type: 'string',
                  description: 'Description/instructions for the assignment',
                },
                dueDate: {
                  type: 'string',
                  description: 'Due date in YYYY-MM-DD format (optional)',
                },
                dueTime: {
                  type: 'string',
                  description: 'Due time in HH:MM format (optional)',
                },
                maxPoints: {
                  type: 'number',
                  description: 'Maximum points for the assignment (optional)',
                },
                workType: {
                  type: 'string',
                  enum: ['ASSIGNMENT', 'SHORT_ANSWER_QUESTION', 'MULTIPLE_CHOICE_QUESTION'],
                  description: 'Type of coursework',
                },
              },
              required: ['courseId', 'title'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.classroom) {
        throw new McpError(
          ErrorCode.InternalError,
          'Google Classroom API not initialized. Please check authentication.'
        );
      }

      try {
        switch (request.params.name) {
          case 'list_courses':
            return await this.listCourses(request.params.arguments || {});
          
          case 'get_course':
            return await this.getCourse(request.params.arguments as { courseId: string });
          
          case 'list_coursework':
            return await this.listCoursework(request.params.arguments as { courseId: string; courseWorkStates?: string[] });
          
          case 'get_coursework':
            return await this.getCoursework(request.params.arguments as { courseId: string; courseWorkId: string });
          
          case 'list_students':
            return await this.listStudents(request.params.arguments as { courseId: string });
          
          case 'list_submissions':
            return await this.listSubmissions(request.params.arguments as { courseId: string; courseWorkId: string; userId?: string });
          
          case 'list_announcements':
            return await this.listAnnouncements(request.params.arguments as { courseId: string; announcementStates?: string[] });
          
          case 'create_coursework':
            return await this.createCoursework(request.params.arguments as any);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error(`Error executing tool ${request.params.name}:`, error);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  private async listCourses(args: any) {
    const response = await this.classroom.courses.list({
      courseStates: args.courseStates,
      teacherId: args.teacherId,
      studentId: args.studentId,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getCourse(args: { courseId: string }) {
    const response = await this.classroom.courses.get({
      id: args.courseId,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listCoursework(args: { courseId: string; courseWorkStates?: string[] }) {
    const response = await this.classroom.courses.courseWork.list({
      courseId: args.courseId,
      courseWorkStates: args.courseWorkStates,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getCoursework(args: { courseId: string; courseWorkId: string }) {
    const response = await this.classroom.courses.courseWork.get({
      courseId: args.courseId,
      id: args.courseWorkId,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listStudents(args: { courseId: string }) {
    const response = await this.classroom.courses.students.list({
      courseId: args.courseId,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listSubmissions(args: { courseId: string; courseWorkId: string; userId?: string }) {
    const response = await this.classroom.courses.courseWork.studentSubmissions.list({
      courseId: args.courseId,
      courseWorkId: args.courseWorkId,
      userId: args.userId,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listAnnouncements(args: { courseId: string; announcementStates?: string[] }) {
    const response = await this.classroom.courses.announcements.list({
      courseId: args.courseId,
      announcementStates: args.announcementStates,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createCoursework(args: any) {
    const courseWork: any = {
      title: args.title,
      description: args.description,
      workType: args.workType || 'ASSIGNMENT',
      state: 'PUBLISHED',
    };

    if (args.maxPoints) {
      courseWork.maxPoints = args.maxPoints;
    }

    if (args.dueDate) {
      const [year, month, day] = args.dueDate.split('-').map(Number);
      courseWork.dueDate = { year, month, day };
      
      if (args.dueTime) {
        const [hours, minutes] = args.dueTime.split(':').map(Number);
        courseWork.dueTime = { hours, minutes };
      }
    }

    const response = await this.classroom.courses.courseWork.create({
      courseId: args.courseId,
      requestBody: courseWork,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Classroom MCP server running on stdio');
  }
}

const server = new GoogleClassroomMCPServer();
server.run().catch(console.error);