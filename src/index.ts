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
import * as fs from 'fs';
import * as path from 'path';

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
        version: '1.0.0',
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
      // Try environment variables first (new method)
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
        this.auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
        );

        this.auth.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });
        
        this.classroom = google.classroom({ version: 'v1', auth: this.auth });
        console.error('Authenticated via environment variables');
        return;
      }

      // Fallback to legacy tokens.json file (backward compatibility)
      const tokensPath = path.join(process.cwd(), 'tokens.json');
      const credentialsPath = path.join(process.cwd(), 'credentials.json');
      
      if (fs.existsSync(tokensPath) && fs.existsSync(credentialsPath)) {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        
        const { client_id, client_secret, redirect_uris } = credentials.web || credentials.installed;
        
        this.auth = new google.auth.OAuth2(
          client_id,
          client_secret,
          redirect_uris[0] || 'urn:ietf:wg:oauth:2.0:oob'
        );

        this.auth.setCredentials(tokens);
        this.classroom = google.classroom({ version: 'v1', auth: this.auth });
        console.error('Authenticated via tokens.json (legacy mode)');
        return;
      }

      console.error('No authentication found. Please run: npm run setup-auth');
      console.error('   Or use legacy: node index.js auth');
      
    } catch (error) {
      console.error('Authentication setup failed:', error);
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Legacy tool names for backward compatibility
          {
            name: 'courses',
            description: 'Get a list of all your Google Classroom courses (legacy)',
            inputSchema: {
              type: 'object',
              properties: {
                courseStates: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by course states (ACTIVE, ARCHIVED, PROVISIONED, DECLINED, SUSPENDED)',
                },
              },
            },
          },
          {
            name: 'course-details',
            description: 'Get detailed information about a specific course including announcements (legacy)',
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
            name: 'assignments',
            description: 'Get assignments and coursework for a specific course (legacy)',
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
          // New enhanced tools
          {
            name: 'list_courses',
            description: 'List all courses with advanced filtering options',
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
            description: 'Create a new assignment in a course (requires teacher permissions)',
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
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                  description: 'Due date in YYYY-MM-DD format. Example: "2026-03-15" for March 15, 2026.',
                },
                dueTime: {
                  type: 'string',
                  pattern: '^\\d{2}:\\d{2}$',
                  description: 'Due time in 24-hour HH:MM format. Example: "23:59" for 11:59 PM, "08:00" for 8:00 AM. Only used if dueDate is also provided.',
                },
                maxPoints: {
                  type: 'number',
                  description: 'Maximum points the assignment is worth. Must be a positive number. Example: 100',
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
          {
            name: 'get_upcoming_assignments',
            description: 'Get upcoming assignments due within the next N days across all active courses. Defaults to 7 days.',
            inputSchema: {
              type: 'object',
              properties: {
                days: {
                  type: 'number',
                  description: 'Number of days to look ahead. Defaults to 7. Example: 7 for one week, 14 for two weeks, 30 for one month.',
                },
              },
            },
          },
          {
            name: 'get_missing_assignments',
            description: 'Get all past-due assignments that have not been submitted across all active courses',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_assignments',
            description: 'Get all published assignments for a specific course, formatted for easy reading',
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
            name: 'get_submission_feedback',
            description: 'Get your grade and feedback for a specific assignment submission',
            inputSchema: {
              type: 'object',
              properties: {
                courseId: {
                  type: 'string',
                  description: 'The ID of the course',
                },
                courseWorkId: {
                  type: 'string',
                  description: 'The ID of the assignment',
                },
              },
              required: ['courseId', 'courseWorkId'],
            },
          },
          {
            name: 'calculate_grade',
            description: 'Calculate your overall grade percentage for a course based on all graded assignments',
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
            name: 'get_assignment_materials',
            description: 'Get all materials and attachments for a specific assignment (Drive files, links, YouTube videos, forms)',
            inputSchema: {
              type: 'object',
              properties: {
                courseId: {
                  type: 'string',
                  description: 'The ID of the course',
                },
                courseWorkId: {
                  type: 'string',
                  description: 'The ID of the assignment',
                },
              },
              required: ['courseId', 'courseWorkId'],
            },
          },
          {
            name: 'get_grades',
            description: 'Get your grades across all active courses, showing assigned grade, max points, and submission state for each assignment',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.classroom) {
        throw new McpError(
          ErrorCode.InternalError,
          'Google Classroom API not initialized. Please run: npm run setup-auth'
        );
      }

      try {
        switch (request.params.name) {
          // Legacy tool compatibility
          case 'courses':
          case 'list_courses':
            return await this.listCourses(request.params.arguments || {});
          
          case 'course-details':
          case 'get_course':
            return await this.getCourse(request.params.arguments as { courseId: string });
          
          case 'assignments':
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

          case 'get_upcoming_assignments':
            return await this.getUpcomingAssignments(request.params.arguments as { days?: number } || {});

          case 'get_missing_assignments':
            return await this.getMissingAssignments();

          case 'get_assignments':
            return await this.getAssignments(request.params.arguments as { courseId: string });

          case 'get_submission_feedback':
            return await this.getSubmissionFeedback(request.params.arguments as { courseId: string; courseWorkId: string });

          case 'calculate_grade':
            return await this.calculateGrade(request.params.arguments as { courseId: string });

          case 'get_assignment_materials':
            return await this.getAssignmentMaterials(request.params.arguments as { courseId: string; courseWorkId: string });

          case 'get_grades':
            return await this.getGrades();

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

  private async getUpcomingAssignments(args: { days?: number } = {}) {
    const days = args.days ?? 7;
    const now = Date.now();
    const cutoff = now + days * 24 * 60 * 60 * 1000;

    const coursesResponse = await this.classroom.courses.list({ courseStates: ['ACTIVE'] });
    const courses: any[] = coursesResponse.data.courses || [];

    const perCourse = await Promise.all(
      courses.map(async (course: any) => {
        try {
          const cwResponse = await this.classroom.courses.courseWork.list({
            courseId: course.id,
            courseWorkStates: ['PUBLISHED'],
          });
          const items: any[] = cwResponse.data.courseWork || [];
          return items
            .filter((cw: any) => {
              if (!cw.dueDate) return false;
              const { year, month, day } = cw.dueDate;
              const due = new Date(year, month - 1, day).getTime();
              return due >= now && due <= cutoff;
            })
            .map((cw: any) => {
              const { year, month, day } = cw.dueDate;
              return {
                courseId: course.id,
                courseName: course.name,
                assignmentId: cw.id,
                title: cw.title,
                dueDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                maxPoints: cw.maxPoints ?? null,
                alternateLink: cw.alternateLink ?? null,
              };
            });
        } catch {
          return [];
        }
      })
    );

    const assignments = perCourse
      .flat()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(assignments, null, 2),
        },
      ],
    };
  }

  private async getGrades() {
    const coursesResponse = await this.classroom.courses.list({ courseStates: ['ACTIVE'] });
    const courses: any[] = coursesResponse.data.courses || [];

    const perCourse = await Promise.all(
      courses.map(async (course: any) => {
        try {
          const [cwResponse, subResponse] = await Promise.all([
            this.classroom.courses.courseWork.list({
              courseId: course.id,
              courseWorkStates: ['PUBLISHED'],
            }),
            this.classroom.courses.courseWork.studentSubmissions.list({
              courseId: course.id,
              courseWorkId: '-',
              userId: 'me',
            }),
          ]);

          const courseworkMap: Record<string, any> = {};
          for (const cw of cwResponse.data.courseWork || []) {
            courseworkMap[cw.id] = cw;
          }

          return (subResponse.data.studentSubmissions || []).map((sub: any) => {
            const cw = courseworkMap[sub.courseWorkId] || {};
            return {
              courseId: course.id,
              courseName: course.name,
              assignmentId: sub.courseWorkId,
              title: cw.title ?? null,
              state: sub.state,
              assignedGrade: sub.assignedGrade ?? null,
              maxPoints: cw.maxPoints ?? null,
              dueDate: cw.dueDate
                ? `${cw.dueDate.year}-${String(cw.dueDate.month).padStart(2, '0')}-${String(cw.dueDate.day).padStart(2, '0')}`
                : null,
              alternateLink: sub.alternateLink ?? null,
            };
          });
        } catch {
          return [];
        }
      })
    );

    const grades = perCourse.flat();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(grades, null, 2),
        },
      ],
    };
  }

  private async getMissingAssignments() {
    const now = Date.now();

    const coursesResponse = await this.classroom.courses.list({ courseStates: ['ACTIVE'] });
    const courses: any[] = coursesResponse.data.courses || [];

    const perCourse = await Promise.all(
      courses.map(async (course: any) => {
        try {
          const [cwResponse, subResponse] = await Promise.all([
            this.classroom.courses.courseWork.list({
              courseId: course.id,
              courseWorkStates: ['PUBLISHED'],
            }),
            this.classroom.courses.courseWork.studentSubmissions.list({
              courseId: course.id,
              courseWorkId: '-',
              userId: 'me',
            }),
          ]);

          const submissionMap: Record<string, any> = {};
          for (const sub of subResponse.data.studentSubmissions || []) {
            submissionMap[sub.courseWorkId] = sub;
          }

          const items: any[] = cwResponse.data.courseWork || [];
          return items
            .filter((cw: any) => {
              if (!cw.dueDate) return false;
              const { year, month, day } = cw.dueDate;
              const due = new Date(year, month - 1, day).getTime();
              if (due >= now) return false;
              const sub = submissionMap[cw.id];
              if (!sub) return true;
              return sub.state !== 'TURNED_IN' && sub.state !== 'RETURNED';
            })
            .map((cw: any) => {
              const { year, month, day } = cw.dueDate;
              const sub = submissionMap[cw.id];
              return {
                courseId: course.id,
                courseName: course.name,
                assignmentId: cw.id,
                title: cw.title,
                dueDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                maxPoints: cw.maxPoints ?? null,
                submissionState: sub?.state ?? 'NOT_STARTED',
                alternateLink: cw.alternateLink ?? null,
              };
            });
        } catch {
          return [];
        }
      })
    );

    const missing = perCourse.flat().sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      content: [{ type: 'text', text: JSON.stringify(missing, null, 2) }],
    };
  }

  private async getAssignments(args: { courseId: string }) {
    const response = await this.classroom.courses.courseWork.list({
      courseId: args.courseId,
      courseWorkStates: ['PUBLISHED'],
    });

    const items: any[] = response.data.courseWork || [];
    const assignments = items.map((cw: any) => ({
      id: cw.id,
      title: cw.title,
      description: cw.description ?? null,
      workType: cw.workType,
      maxPoints: cw.maxPoints ?? null,
      dueDate: cw.dueDate
        ? `${cw.dueDate.year}-${String(cw.dueDate.month).padStart(2, '0')}-${String(cw.dueDate.day).padStart(2, '0')}`
        : null,
      creationTime: cw.creationTime ?? null,
      alternateLink: cw.alternateLink ?? null,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(assignments, null, 2) }],
    };
  }

  private async getSubmissionFeedback(args: { courseId: string; courseWorkId: string }) {
    const [cwResponse, subResponse] = await Promise.all([
      this.classroom.courses.courseWork.get({
        courseId: args.courseId,
        id: args.courseWorkId,
      }),
      this.classroom.courses.courseWork.studentSubmissions.list({
        courseId: args.courseId,
        courseWorkId: args.courseWorkId,
        userId: 'me',
      }),
    ]);

    const cw = cwResponse.data;
    const submission = (subResponse.data.studentSubmissions || [])[0] ?? null;

    const result = {
      assignmentTitle: cw.title,
      assignmentDescription: cw.description ?? null,
      maxPoints: cw.maxPoints ?? null,
      submission: submission
        ? {
            state: submission.state,
            assignedGrade: submission.assignedGrade ?? null,
            draftGrade: submission.draftGrade ?? null,
            late: submission.late ?? false,
            updateTime: submission.updateTime ?? null,
          }
        : null,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async calculateGrade(args: { courseId: string }) {
    const [cwResponse, subResponse] = await Promise.all([
      this.classroom.courses.courseWork.list({
        courseId: args.courseId,
        courseWorkStates: ['PUBLISHED'],
      }),
      this.classroom.courses.courseWork.studentSubmissions.list({
        courseId: args.courseId,
        courseWorkId: '-',
        userId: 'me',
      }),
    ]);

    const courseworkMap: Record<string, any> = {};
    for (const cw of cwResponse.data.courseWork || []) {
      courseworkMap[cw.id] = cw;
    }

    let totalEarned = 0;
    let totalPossible = 0;
    const breakdown: any[] = [];

    for (const sub of subResponse.data.studentSubmissions || []) {
      const cw = courseworkMap[sub.courseWorkId];
      if (!cw || cw.maxPoints == null || sub.assignedGrade == null) continue;
      totalEarned += sub.assignedGrade;
      totalPossible += cw.maxPoints;
      breakdown.push({
        assignmentId: sub.courseWorkId,
        title: cw.title ?? null,
        earned: sub.assignedGrade,
        possible: cw.maxPoints,
        percentage: cw.maxPoints > 0 ? Math.round((sub.assignedGrade / cw.maxPoints) * 1000) / 10 : null,
      });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          courseId: args.courseId,
          totalEarned,
          totalPossible,
          overallPercentage: totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 1000) / 10 : null,
          gradedAssignments: breakdown.length,
          breakdown,
        }, null, 2),
      }],
    };
  }

  private async getAssignmentMaterials(args: { courseId: string; courseWorkId: string }) {
    const response = await this.classroom.courses.courseWork.get({
      courseId: args.courseId,
      id: args.courseWorkId,
    });

    const cw = response.data;
    const materials = (cw.materials || []).map((m: any) => {
      if (m.driveFile) {
        return {
          type: 'driveFile',
          title: m.driveFile.driveFile?.title ?? null,
          url: m.driveFile.driveFile?.alternateLink ?? null,
          shareMode: m.driveFile.shareMode ?? null,
        };
      } else if (m.youTubeVideo) {
        return {
          type: 'youTubeVideo',
          title: m.youTubeVideo.title ?? null,
          url: m.youTubeVideo.alternateLink ?? null,
          thumbnailUrl: m.youTubeVideo.thumbnailUrl ?? null,
        };
      } else if (m.link) {
        return {
          type: 'link',
          title: m.link.title ?? null,
          url: m.link.url ?? null,
        };
      } else if (m.form) {
        return {
          type: 'form',
          title: m.form.title ?? null,
          url: m.form.formUrl ?? null,
          responseUrl: m.form.responseUrl ?? null,
        };
      }
      return { type: 'unknown', raw: m };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          assignmentId: cw.id,
          title: cw.title,
          description: cw.description ?? null,
          materials,
          alternateLink: cw.alternateLink ?? null,
        }, null, 2),
      }],
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