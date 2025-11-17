/**
 * Infrastructure as Code (IaC) Generation - Barrel Exports
 *
 * This module provides Terraform template generation capabilities for serverless platforms:
 * - Handlebars template engine
 * - Multi-platform support (AWS Lambda, Azure Functions, GCP, Firebase, Supabase)
 * - Environment-specific configuration (dev, staging, prod)
 */

// Template engine
export * from './template-engine.js';
