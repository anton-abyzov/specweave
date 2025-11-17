/**
 * Firebase Template Generation Integration Tests
 *
 * Tests configuration generation for Firebase services:
 * - Firebase configuration files (firebase.json, .firebaserc)
 * - Cloud Functions for Firebase
 * - Firestore security rules
 * - Firebase Hosting
 * - Firebase Storage rules
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTemplateEngine } from '../../../src/core/iac/template-engine.js';
import type {
  TerraformTemplateEngine,
  TemplateVariables,
} from '../../../src/core/iac/template-engine.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Firebase Template Generation Integration', () => {
  let engine: TerraformTemplateEngine;
  let tempDir: string;

  beforeEach(() => {
    engine = createTemplateEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firebase-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    engine.clearCache();
  });

  describe('testFirebaseConfiguration', () => {
    it('should generate firebase.json configuration', () => {
      const template = engine.loadTemplateString(`{
  "functions": {
    "source": "{{functionsSource}}",
    "runtime": "{{runtime}}",
    "predeploy": {{tfList predeployCommands}},
    "ignore": {{tfList ignorePatterns}}
  },
  "firestore": {
    "rules": "{{firestoreRulesFile}}",
    "indexes": "{{firestoreIndexesFile}}"
  },
  "hosting": {
    "public": "{{hostingPublicDir}}",
    "ignore": {{tfList hostingIgnorePatterns}}
  }
}`);

      const variables: TemplateVariables = {
        functionsSource: 'functions',
        runtime: 'nodejs18',
        predeployCommands: ['npm --prefix functions run build'],
        ignorePatterns: ['node_modules', '.git'],
        firestoreRulesFile: 'firestore.rules',
        firestoreIndexesFile: 'firestore.indexes.json',
        hostingPublicDir: 'public',
        hostingIgnorePatterns: ['**/node_modules/**'],
      };

      const result = template(variables);

      expect(result).toContain('"source": "functions"');
      expect(result).toContain('"runtime": "nodejs18"');
      expect(result).toContain('["npm --prefix functions run build"]');
      expect(result).toContain('"public": "public"');
    });

    it('should generate .firebaserc configuration', () => {
      const template = engine.loadTemplateString(`{
  "projects": {
    "default": "{{projectId}}"
  }{{#if targets}},
  "targets": {
    "{{projectId}}": {
      {{#each targets}}
      "{{@key}}": {{tfList this}}{{#unless @last}},{{/unless}}
      {{/each}}
    }
  }{{/if}}
}`);

      const variables: TemplateVariables = {
        projectId: 'my-firebase-project',
        targets: {
          hosting: ['my-site'],
        },
      };

      const result = template(variables);

      expect(result).toContain('"default": "my-firebase-project"');
      expect(result).toContain('"hosting": ["my-site"]');
    });
  });

  describe('testCloudFunctionsForFirebase', () => {
    it('should generate TypeScript Cloud Function structure', () => {
      const template = engine.loadTemplateString(`import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const {{functionName}} = functions.https.onRequest(async (req, res) => {
  // {{description}}
  try {
    const result = await handleRequest(req);
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleRequest(req: functions.https.Request) {
  // Implementation here
  return { message: '{{successMessage}}' };
}`);

      const variables: TemplateVariables = {
        functionName: 'apiHandler',
        description: 'Handles API requests',
        successMessage: 'Request processed successfully',
      };

      const result = template(variables);

      expect(result).toContain('export const apiHandler');
      expect(result).toContain('// Handles API requests');
      expect(result).toContain("message: 'Request processed successfully'");
    });

    it('should generate Firestore trigger function', () => {
      const template = engine.loadTemplateString(`import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const {{functionName}} = functions.firestore
  .document('{{collectionPath}}')
  .{{triggerType}}(async ({{#if (eq triggerType "onWrite")}}change{{else}}snapshot{{/if}}, context) => {
    // {{description}}
    const data = {{#if (eq triggerType "onWrite")}}change.after.data(){{else}}snapshot.data(){{/if}};

    // Process data
    console.log('Processing:', context.params);
  });`);

      const variables: TemplateVariables = {
        functionName: 'onUserCreated',
        collectionPath: 'users/{userId}',
        triggerType: 'onCreate',
        description: 'Triggered when a new user is created',
      };

      const result = template(variables);

      expect(result).toContain('export const onUserCreated');
      expect(result).toContain("document('users/{userId}')");
      expect(result).toContain('.onCreate(');
    });

    it('should generate scheduled function', () => {
      const template = engine.loadTemplateString(`import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const {{functionName}} = functions.pubsub
  .schedule('{{cronSchedule}}')
  .timeZone('{{timeZone}}')
  .onRun(async (context) => {
    // {{description}}
    console.log('Running scheduled task');

    // Task implementation
    await performTask();
  });

async function performTask() {
  // Implementation
}`);

      const variables: TemplateVariables = {
        functionName: 'dailyCleanup',
        cronSchedule: 'every day 02:00',
        timeZone: 'America/New_York',
        description: 'Daily cleanup task',
      };

      const result = template(variables);

      expect(result).toContain('export const dailyCleanup');
      expect(result).toContain("schedule('every day 02:00')");
      expect(result).toContain("timeZone('America/New_York')");
    });
  });

  describe('testFirestoreSecurityRules', () => {
    it('should generate Firestore security rules', () => {
      const template = engine.loadTemplateString(`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    {{#each collections}}
    // {{this.description}}
    match /{{this.path}}/{documentId} {
      allow read: if {{this.readRule}};
      allow write: if {{this.writeRule}};
    }
    {{/each}}
  }
}`);

      const variables: TemplateVariables = {
        collections: [
          {
            path: 'users',
            description: 'User profiles',
            readRule: 'request.auth != null',
            writeRule: 'request.auth != null && request.auth.uid == documentId',
          },
          {
            path: 'posts',
            description: 'Public posts',
            readRule: 'true',
            writeRule: 'request.auth != null',
          },
        ],
      };

      const result = template(variables);

      expect(result).toContain("rules_version = '2'");
      expect(result).toContain('match /users/{documentId}');
      expect(result).toContain('allow read: if request.auth != null');
      expect(result).toContain('match /posts/{documentId}');
      expect(result).toContain('allow read: if true');
    });

    it('should generate complex Firestore rules with functions', () => {
      const template = engine.loadTemplateString(`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // {{collectionName}} collection
    match /{{collectionPath}}/{documentId} {
      allow read: if {{readCondition}};
      allow create: if {{createCondition}};
      allow update: if {{updateCondition}};
      allow delete: if {{deleteCondition}};
    }
  }
}`);

      const variables: TemplateVariables = {
        collectionName: 'User data',
        collectionPath: 'users',
        readCondition: 'isSignedIn()',
        createCondition: 'isSignedIn()',
        updateCondition: 'isOwner(documentId)',
        deleteCondition: 'isOwner(documentId)',
      };

      const result = template(variables);

      expect(result).toContain('function isSignedIn()');
      expect(result).toContain('function isOwner(userId)');
      expect(result).toContain('allow read: if isSignedIn()');
      expect(result).toContain('allow delete: if isOwner(documentId)');
    });
  });

  describe('testFirestoreIndexes', () => {
    it('should generate Firestore indexes configuration', () => {
      const template = engine.loadTemplateString(`{
  "indexes": [
    {{#each indexes}}
    {
      "collectionGroup": "{{this.collection}}",
      "queryScope": "{{this.queryScope}}",
      "fields": [
        {{#each this.fields}}
        {
          "fieldPath": "{{this.fieldPath}}",
          "order": "{{this.order}}"
        }{{#unless @last}},{{/unless}}
        {{/each}}
      ]
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ],
  "fieldOverrides": []
}`);

      const variables: TemplateVariables = {
        indexes: [
          {
            collection: 'users',
            queryScope: 'COLLECTION',
            fields: [
              { fieldPath: 'email', order: 'ASCENDING' },
              { fieldPath: 'createdAt', order: 'DESCENDING' },
            ],
          },
          {
            collection: 'posts',
            queryScope: 'COLLECTION',
            fields: [
              { fieldPath: 'authorId', order: 'ASCENDING' },
              { fieldPath: 'publishedAt', order: 'DESCENDING' },
            ],
          },
        ],
      };

      const result = template(variables);

      expect(result).toContain('"collectionGroup": "users"');
      expect(result).toContain('"fieldPath": "email"');
      expect(result).toContain('"order": "ASCENDING"');
      expect(result).toContain('"collectionGroup": "posts"');
    });
  });

  describe('testFirebaseStorageRules', () => {
    it('should generate Storage security rules', () => {
      const template = engine.loadTemplateString(`rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    {{#each paths}}
    // {{this.description}}
    match /{{this.path}} {
      allow read: if {{this.readRule}};
      allow write: if {{this.writeRule}};
    }
    {{/each}}
  }
}`);

      const variables: TemplateVariables = {
        paths: [
          {
            path: 'users/{userId}/{fileName}',
            description: 'User uploaded files',
            readRule: 'request.auth != null',
            writeRule: 'request.auth != null && request.auth.uid == userId',
          },
          {
            path: 'public/{fileName}',
            description: 'Public files',
            readRule: 'true',
            writeRule: 'request.auth != null',
          },
        ],
      };

      const result = template(variables);

      expect(result).toContain('service firebase.storage');
      expect(result).toContain('match /users/{userId}/{fileName}');
      expect(result).toContain('allow write: if request.auth != null && request.auth.uid == userId');
      expect(result).toContain('match /public/{fileName}');
    });
  });

  describe('testFirebaseHosting', () => {
    it('should generate hosting configuration with rewrites', () => {
      const template = engine.loadTemplateString(`{
  "hosting": {
    "public": "{{publicDir}}",
    "ignore": {{tfList ignorePatterns}},
    {{#if rewrites}}
    "rewrites": [
      {{#each rewrites}}
      {
        "source": "{{this.source}}",
        {{#if this.function}}
        "function": "{{this.function}}"
        {{else if this.destination}}
        "destination": "{{this.destination}}"
        {{/if}}
      }{{#unless @last}},{{/unless}}
      {{/each}}
    ],
    {{/if}}
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "{{cacheControl}}"
          }
        ]
      }
    ]
  }
}`);

      const variables: TemplateVariables = {
        publicDir: 'dist',
        ignorePatterns: ['**/node_modules/**', '**/.git/**'],
        rewrites: [
          { source: '/api/**', function: 'api' },
          { source: '**', destination: '/index.html' },
        ],
        cacheControl: 'public, max-age=3600',
      };

      const result = template(variables);

      expect(result).toContain('"public": "dist"');
      expect(result).toContain('"source": "/api/**"');
      expect(result).toContain('"function": "api"');
      expect(result).toContain('"destination": "/index.html"');
    });
  });

  describe('testCompleteConfiguration', () => {
    it('should generate complete Firebase project configuration', () => {
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      fs.writeFileSync(
        path.join(templateDir, 'main.tf.hbs'),
        `# Firebase Configuration
# firebase.json
{
  "functions": {
    "source": "{{functionsSource}}",
    "runtime": "{{runtime}}"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "{{hostingPublicDir}}",
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      }
    ]
  }
}

# Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{{collectionPath}}/{documentId} {
      allow read, write: if request.auth != null;
    }
  }
}
`
      );

      fs.writeFileSync(
        path.join(templateDir, 'variables.tf.hbs'),
        `variable "project_id" {
  type = string
}
`
      );

      fs.writeFileSync(
        path.join(templateDir, 'outputs.tf.hbs'),
        `output "project_id" {
  value = "{{projectId}}"
}

output "functions_source" {
  value = "{{functionsSource}}"
}
`
      );

      const variables: TemplateVariables = {
        projectId: 'my-firebase-project',
        functionsSource: 'functions',
        runtime: 'nodejs18',
        hostingPublicDir: 'public',
        collectionPath: 'users',
      };

      const result = engine.renderTerraformConfig(templateDir, variables);

      expect(result.mainTf).toContain('"functions"');
      expect(result.mainTf).toContain('"firestore"');
      expect(result.mainTf).toContain('"hosting"');
      expect(result.mainTf).toContain('rules_version');

      expect(result.variablesTf).toContain('variable "project_id"');
      expect(result.outputsTf).toContain('output "project_id"');
    });
  });
});
