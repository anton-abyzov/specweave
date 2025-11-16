/**
 * Schema Catalog Generator
 *
 * Generates Schema Registry catalog documentation
 *
 * @module schema-catalog-generator
 */

/**
 * Schema Version
 */
export interface SchemaVersion {
  /** Schema ID */
  id: number;
  /** Version number */
  version: number;
  /** Schema definition (Avro/Protobuf/JSON) */
  schema: string;
  /** Schema type */
  schemaType: 'AVRO' | 'PROTOBUF' | 'JSON';
}

/**
 * Subject Metadata
 */
export interface SubjectMetadata {
  /** Subject name */
  subject: string;
  /** Latest version */
  latestVersion: number;
  /** Compatibility mode */
  compatibility: 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE';
  /** All versions */
  versions: SchemaVersion[];
}

/**
 * Schema Catalog
 */
export interface SchemaCatalog {
  /** Total subjects */
  totalSubjects: number;
  /** Subjects */
  subjects: SubjectMetadata[];
  /** Generated timestamp */
  generatedAt: Date;
}

/**
 * Schema Catalog Generator
 *
 * Generates documentation for Schema Registry
 */
export class SchemaCatalogGenerator {
  /**
   * Generate schema catalog from Schema Registry
   */
  static async generate(schemaRegistryUrl: string): Promise<SchemaCatalog> {
    // In real implementation, would use @kafkajs/confluent-schema-registry
    // For now, return mock data structure

    const subjects: SubjectMetadata[] = [];

    // Would fetch from Schema Registry REST API:
    // GET /subjects
    // GET /subjects/{subject}/versions
    // GET /subjects/{subject}/versions/{version}
    // GET /config/{subject}

    return {
      totalSubjects: subjects.length,
      subjects,
      generatedAt: new Date(),
    };
  }

  /**
   * Format catalog as Markdown
   */
  static formatAsMarkdown(catalog: SchemaCatalog): string {
    const lines: string[] = [];

    lines.push('# Schema Registry Catalog');
    lines.push('');
    lines.push(`**Total Subjects**: ${catalog.totalSubjects}`);
    lines.push(`**Generated**: ${catalog.generatedAt.toISOString()}`);
    lines.push('');

    for (const subject of catalog.subjects) {
      lines.push(`## ${subject.subject}`);
      lines.push('');
      lines.push(`**Latest Version**: ${subject.latestVersion}`);
      lines.push(`**Compatibility Mode**: ${subject.compatibility}`);
      lines.push('');

      lines.push('### Versions');
      lines.push('');
      lines.push('| Version | Schema ID | Type |');
      lines.push('|---------|-----------|------|');

      for (const version of subject.versions) {
        lines.push(`| ${version.version} | ${version.id} | ${version.schemaType} |`);
      }

      lines.push('');

      // Latest schema definition
      const latestVersion = subject.versions[subject.versions.length - 1];
      if (latestVersion) {
        lines.push('### Latest Schema');
        lines.push('');
        lines.push('```json');
        lines.push(latestVersion.schema);
        lines.push('```');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Format catalog as JSON
   */
  static formatAsJSON(catalog: SchemaCatalog): string {
    return JSON.stringify(catalog, null, 2);
  }
}

export default SchemaCatalogGenerator;
