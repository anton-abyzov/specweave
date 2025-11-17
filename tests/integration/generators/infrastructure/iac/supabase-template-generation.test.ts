/**
 * Supabase Template Generation Integration Tests
 *
 * Tests configuration generation for Supabase services:
 * - Supabase project configuration
 * - PostgreSQL database schema
 * - Edge Functions (Deno)
 * - Row Level Security (RLS) policies
 * - Realtime configuration
 * - Storage buckets and policies
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTemplateEngine } from '../../src/core/iac/template-engine.js';
import type {
  TerraformTemplateEngine,
  TemplateVariables,
} from '../../src/core/iac/template-engine.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Supabase Template Generation Integration', () => {
  let engine: TerraformTemplateEngine;
  let tempDir: string;

  beforeEach(() => {
    engine = createTemplateEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supabase-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    engine.clearCache();
  });

  describe('testSupabaseConfiguration', () => {
    it('should generate Supabase config.toml', () => {
      const template = engine.loadTemplateString(`[project]
name = "{{projectName}}"
organization_id = "{{organizationId}}"

[api]
port = {{apiPort}}
schemas = {{tfList schemas}}
max_rows = {{maxRows}}

[db]
port = {{dbPort}}
shadow_port = {{shadowPort}}
major_version = {{postgresVersion}}

[auth]
enabled = {{authEnabled}}
site_url = "{{siteUrl}}"
{{#if authProviders}}
[auth.external.{{authProviders.google.provider}}]
enabled = {{authProviders.google.enabled}}
{{/if}}`);

      const variables: TemplateVariables = {
        projectName: 'my-project',
        organizationId: 'org-123',
        apiPort: 54321,
        schemas: ['public', 'storage', 'auth'],
        maxRows: 1000,
        dbPort: 54322,
        shadowPort: 54320,
        postgresVersion: 15,
        authEnabled: true,
        siteUrl: 'http://localhost:3000',
        authProviders: {
          google: {
            provider: 'google',
            enabled: true,
          },
        },
      };

      const result = template(variables);

      expect(result).toContain('name = "my-project"');
      expect(result).toContain('port = 54321');
      expect(result).toContain('["public", "storage", "auth"]');
      expect(result).toContain('major_version = 15');
    });
  });

  describe('testPostgreSQLSchema', () => {
    it('should generate PostgreSQL table schema', () => {
      const template = engine.loadTemplateString(`-- {{tableName}} table
CREATE TABLE IF NOT EXISTS {{schemaName}}.{{tableName}} (
  {{#each columns}}
  {{this.name}} {{this.type}}{{#if this.primaryKey}} PRIMARY KEY{{/if}}{{#if this.notNull}} NOT NULL{{/if}}{{#if this.default}} DEFAULT {{this.default}}{{/if}}{{#unless @last}},{{/unless}}
  {{/each}}
);

{{#if enableRLS}}
-- Enable Row Level Security
ALTER TABLE {{schemaName}}.{{tableName}} ENABLE ROW LEVEL SECURITY;
{{/if}}

-- Indexes
{{#each indexes}}
CREATE INDEX IF NOT EXISTS {{this.name}} ON {{../schemaName}}.{{../tableName}} ({{this.columns}});
{{/each}}`);

      const variables: TemplateVariables = {
        schemaName: 'public',
        tableName: 'users',
        enableRLS: true,
        columns: [
          { name: 'id', type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
          { name: 'email', type: 'TEXT', notNull: true },
          { name: 'name', type: 'TEXT', notNull: false },
          { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
        ],
        indexes: [
          { name: 'users_email_idx', columns: 'email' },
          { name: 'users_created_at_idx', columns: 'created_at' },
        ],
      };

      const result = template(variables);

      expect(result).toContain('CREATE TABLE IF NOT EXISTS public.users');
      expect(result).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
      expect(result).toContain('email TEXT NOT NULL');
      expect(result).toContain('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY');
      expect(result).toContain('CREATE INDEX IF NOT EXISTS users_email_idx');
    });

    it('should generate table with foreign keys and constraints', () => {
      const template = engine.loadTemplateString(`CREATE TABLE {{tableName}} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  {{#each columns}}
  {{this.name}} {{this.type}}{{#if this.notNull}} NOT NULL{{/if}}{{#unless @last}},{{/unless}}
  {{/each}}{{#if foreignKeys}},{{/if}}

  {{#each foreignKeys}}
  FOREIGN KEY ({{this.column}}) REFERENCES {{this.referencedTable}}({{this.referencedColumn}}){{#if this.onDelete}} ON DELETE {{this.onDelete}}{{/if}}{{#unless @last}},{{/unless}}
  {{/each}}
);`);

      const variables: TemplateVariables = {
        tableName: 'posts',
        columns: [
          { name: 'title', type: 'TEXT', notNull: true },
          { name: 'content', type: 'TEXT' },
          { name: 'author_id', type: 'UUID', notNull: true },
        ],
        foreignKeys: [
          {
            column: 'author_id',
            referencedTable: 'users',
            referencedColumn: 'id',
            onDelete: 'CASCADE',
          },
        ],
      };

      const result = template(variables);

      expect(result).toContain('CREATE TABLE posts');
      expect(result).toContain('author_id UUID NOT NULL');
      expect(result).toContain('FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE');
    });
  });

  describe('testRowLevelSecurity', () => {
    it('should generate RLS policies', () => {
      const template = engine.loadTemplateString(`-- RLS Policies for {{tableName}}

{{#each policies}}
-- {{this.description}}
CREATE POLICY {{this.name}}
ON {{../tableName}}
FOR {{this.operation}}
{{#if this.using}}
USING ({{this.using}})
{{/if}}
{{#if this.withCheck}}
WITH CHECK ({{this.withCheck}})
{{/if}};

{{/each}}`);

      const variables: TemplateVariables = {
        tableName: 'posts',
        policies: [
          {
            name: 'posts_select_policy',
            description: 'Users can view all posts',
            operation: 'SELECT',
            using: 'true',
          },
          {
            name: 'posts_insert_policy',
            description: 'Users can insert their own posts',
            operation: 'INSERT',
            withCheck: 'auth.uid() = author_id',
          },
          {
            name: 'posts_update_policy',
            description: 'Users can update their own posts',
            operation: 'UPDATE',
            using: 'auth.uid() = author_id',
            withCheck: 'auth.uid() = author_id',
          },
          {
            name: 'posts_delete_policy',
            description: 'Users can delete their own posts',
            operation: 'DELETE',
            using: 'auth.uid() = author_id',
          },
        ],
      };

      const result = template(variables);

      expect(result).toContain('CREATE POLICY posts_select_policy');
      expect(result).toContain('FOR SELECT');
      expect(result).toContain('USING (true)');
      expect(result).toContain('CREATE POLICY posts_insert_policy');
      expect(result).toContain('WITH CHECK (auth.uid() = author_id)');
      expect(result).toContain('CREATE POLICY posts_update_policy');
      expect(result).toContain('FOR UPDATE');
    });
  });

  describe('testEdgeFunctions', () => {
    it('should generate Deno Edge Function', () => {
      const template = engine.loadTemplateString(`// {{functionName}} - {{description}}
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
{{#if useSupabaseClient}}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
{{/if}}

serve(async (req) => {
  {{#if cors}}
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '{{corsOrigin}}',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }
  {{/if}}

  try {
    {{#if useSupabaseClient}}
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )
    {{/if}}

    // Function logic here
    const data = await req.json()
    const result = await processRequest(data)

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          'Content-Type': 'application/json',
          {{#if cors}}
          'Access-Control-Allow-Origin': '{{corsOrigin}}',
          {{/if}}
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})

async function processRequest(data: any) {
  // Implementation
  return { success: true }
}
`);

      const variables: TemplateVariables = {
        functionName: 'apiHandler',
        description: 'Handles API requests',
        cors: true,
        corsOrigin: '*',
        useSupabaseClient: true,
      };

      const result = template(variables);

      expect(result).toContain('// apiHandler - Handles API requests');
      expect(result).toContain("import { serve } from 'https://deno.land/std");
      expect(result).toContain("import { createClient } from 'https://esm.sh/@supabase/supabase-js");
      expect(result).toContain("'Access-Control-Allow-Origin': '*'");
    });
  });

  describe('testStorageBuckets', () => {
    it('should generate Storage bucket configuration', () => {
      const template = engine.loadTemplateString(`-- Storage bucket: {{bucketName}}
INSERT INTO storage.buckets (id, name, public)
VALUES ('{{bucketId}}', '{{bucketName}}', {{isPublic}});

{{#if policies}}
-- Storage policies
{{#each policies}}
CREATE POLICY {{this.name}}
ON storage.objects
FOR {{this.operation}}
{{#if this.using}}
USING (bucket_id = '{{../bucketId}}' AND {{this.using}})
{{/if}}
{{#if this.withCheck}}
WITH CHECK (bucket_id = '{{../bucketId}}' AND {{this.withCheck}})
{{/if}};

{{/each}}
{{/if}}`);

      const variables: TemplateVariables = {
        bucketId: 'avatars',
        bucketName: 'avatars',
        isPublic: true,
        policies: [
          {
            name: 'avatar_upload_policy',
            operation: 'INSERT',
            withCheck: 'auth.uid() = (storage.foldername(name))[1]::uuid',
          },
          {
            name: 'avatar_read_policy',
            operation: 'SELECT',
            using: 'true',
          },
        ],
      };

      const result = template(variables);

      expect(result).toContain("INSERT INTO storage.buckets");
      expect(result).toContain("VALUES ('avatars', 'avatars', true)");
      expect(result).toContain('CREATE POLICY avatar_upload_policy');
      expect(result).toContain("bucket_id = 'avatars'");
    });
  });

  describe('testRealtimeConfiguration', () => {
    it('should generate Realtime publication configuration', () => {
      const template = engine.loadTemplateString(`-- Enable Realtime for {{tableName}}
BEGIN;
  -- Remove existing publication if exists
  DROP PUBLICATION IF EXISTS supabase_realtime;

  -- Create publication
  CREATE PUBLICATION supabase_realtime;

  -- Add tables to publication
  {{#each tables}}
  ALTER PUBLICATION supabase_realtime ADD TABLE {{this}};
  {{/each}}
COMMIT;

-- Grant access
{{#each tables}}
GRANT SELECT ON {{this}} TO anon, authenticated;
{{/each}}`);

      const variables: TemplateVariables = {
        tableName: 'messages',
        tables: ['public.messages', 'public.users', 'public.presence'],
      };

      const result = template(variables);

      expect(result).toContain('CREATE PUBLICATION supabase_realtime');
      expect(result).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.messages');
      expect(result).toContain('GRANT SELECT ON public.messages TO anon, authenticated');
    });
  });

  describe('testCompleteConfiguration', () => {
    it('should generate complete Supabase project setup', () => {
      const templateDir = path.join(tempDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });

      fs.writeFileSync(
        path.join(templateDir, 'main.tf.hbs'),
        `-- Database Schema
CREATE TABLE IF NOT EXISTS public.{{tableName}} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.{{tableName}} ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY {{tableName}}_select_policy
ON public.{{tableName}}
FOR SELECT
USING (true);

CREATE POLICY {{tableName}}_insert_policy
ON public.{{tableName}}
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('{{bucketName}}', '{{bucketName}}', false);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.{{tableName}};
`
      );

      fs.writeFileSync(
        path.join(templateDir, 'variables.tf.hbs'),
        `variable "project_name" {
  type = string
}

variable "organization_id" {
  type = string
}
`
      );

      fs.writeFileSync(
        path.join(templateDir, 'outputs.tf.hbs'),
        `output "table_name" {
  value = "{{tableName}}"
}

output "bucket_name" {
  value = "{{bucketName}}"
}
`
      );

      const variables: TemplateVariables = {
        projectName: 'my-supabase-project',
        organizationId: 'org-123',
        tableName: 'users',
        bucketName: 'avatars',
      };

      const result = engine.renderTerraformConfig(templateDir, variables);

      expect(result.mainTf).toContain('CREATE TABLE IF NOT EXISTS public.users');
      expect(result.mainTf).toContain('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY');
      expect(result.mainTf).toContain('CREATE POLICY users_select_policy');
      expect(result.mainTf).toContain("INSERT INTO storage.buckets");
      expect(result.mainTf).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.users');

      expect(result.variablesTf).toContain('variable "project_name"');
      expect(result.outputsTf).toContain('output "table_name"');
      expect(result.outputsTf).toContain('output "bucket_name"');
    });
  });
});
