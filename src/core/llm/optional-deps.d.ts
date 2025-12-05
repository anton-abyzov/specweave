/**
 * Type declarations for optional LLM SDK dependencies.
 *
 * These SDKs are dynamically imported at runtime and are not required
 * unless the user configures that specific provider.
 */

// OpenAI SDK stub
declare module 'openai' {
  export default class OpenAI {
    constructor(config: { apiKey: string; baseURL?: string });
    chat: {
      completions: {
        create(params: {
          model: string;
          messages: Array<{ role: string; content: string }>;
          max_tokens?: number;
          temperature?: number;
        }): Promise<{
          choices: Array<{
            message: { content: string | null };
            finish_reason: string;
          }>;
          usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
        }>;
      };
    };
  }

  export class AzureOpenAI extends OpenAI {
    constructor(config: {
      apiKey: string;
      endpoint: string;
      apiVersion: string;
      deployment?: string;
    });
  }
}

// AWS Bedrock SDK stub
declare module '@aws-sdk/client-bedrock-runtime' {
  export interface BedrockRuntimeClientConfig {
    region?: string;
  }

  export class BedrockRuntimeClient {
    constructor(config: BedrockRuntimeClientConfig);
    send<T>(command: T): Promise<InvokeModelCommandOutput>;
  }

  export interface InvokeModelCommandInput {
    modelId: string;
    contentType: string;
    accept: string;
    body: string | Uint8Array;  // Accept both string and Uint8Array
  }

  export class InvokeModelCommand {
    constructor(input: InvokeModelCommandInput);
  }

  export interface InvokeModelCommandOutput {
    body: Uint8Array;
  }

  // Placeholder for ListFoundationModelsCommand (actually in @aws-sdk/client-bedrock)
  export class ListFoundationModelsCommand {
    constructor(input?: Record<string, unknown>);
  }
}

// Google Vertex AI SDK stub
declare module '@google-cloud/vertexai' {
  export interface VertexAIConfig {
    project: string;
    location: string;
  }

  export class VertexAI {
    constructor(config: VertexAIConfig);
    getGenerativeModel(config: { model: string }): GenerativeModel;
  }

  export interface GenerativeModel {
    generateContent(content: string | {
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
      generationConfig?: {
        maxOutputTokens?: number;
        temperature?: number;
      };
    }): Promise<{
      response: {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };
    }>;
  }
}
