/**
 * DORA Tier Classifier
 *
 * Maps metric values to DORA performance tiers based on industry benchmarks
 *
 * @see https://dora.dev/ - DORA Research
 */

import { DORAType } from '../types.js';

/**
 * Classify Deployment Frequency
 *
 * Benchmarks (deploys per year):
 * - Elite: >365 (on-demand, multiple per day)
 * - High: 52-365 (weekly to daily)
 * - Medium: 12-52 (monthly to weekly)
 * - Low: <12 (less than monthly)
 *
 * @param deploysPerYear - Number of deployments per year
 * @returns DORA tier
 */
export function classifyDeploymentFrequency(deploysPerYear: number): DORAType {
  if (deploysPerYear === 0) return 'N/A';
  if (deploysPerYear > 365) return 'Elite';
  if (deploysPerYear >= 52) return 'High';
  if (deploysPerYear >= 12) return 'Medium';
  return 'Low';
}

/**
 * Classify Lead Time for Changes
 *
 * Benchmarks (hours from commit to production):
 * - Elite: <1 hour
 * - High: 1 hour to 1 day (24 hours)
 * - Medium: 1 day to 1 week (168 hours)
 * - Low: 1 week to 1 month (720 hours)
 *
 * @param hours - Average lead time in hours
 * @returns DORA tier
 */
export function classifyLeadTime(hours: number): DORAType {
  if (hours === 0) return 'N/A';
  if (hours < 1) return 'Elite';
  if (hours < 24) return 'High';
  if (hours < 168) return 'Medium';  // 7 days
  return 'Low';
}

/**
 * Classify Change Failure Rate
 *
 * Benchmarks (percentage of failed deployments):
 * - Elite: <5%
 * - High: 5-10%
 * - Medium: 10-15%
 * - Low: >15%
 *
 * @param percentage - Change failure rate (0-100)
 * @returns DORA tier
 */
export function classifyChangeFailureRate(percentage: number): DORAType {
  if (percentage < 0) return 'N/A';  // Invalid
  if (percentage < 5) return 'Elite';
  if (percentage < 10) return 'High';
  if (percentage < 15) return 'Medium';
  return 'Low';
}

/**
 * Classify Mean Time to Recovery (MTTR)
 *
 * Benchmarks (minutes to recover from incident):
 * - Elite: <60 minutes (1 hour)
 * - High: 60 minutes to 1 day (1440 minutes)
 * - Medium: 1 day to 1 week (10080 minutes)
 * - Low: >1 week
 *
 * @param minutes - Average recovery time in minutes
 * @returns DORA tier
 */
export function classifyMTTR(minutes: number): DORAType {
  if (minutes === 0) return 'N/A';
  if (minutes < 60) return 'Elite';
  if (minutes < 1440) return 'High';  // 24 hours
  if (minutes < 10080) return 'Medium';  // 7 days
  return 'Low';
}
