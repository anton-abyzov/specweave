class SchemaCatalogGenerator {
  /**
   * Generate schema catalog from Schema Registry
   */
  static async generate(schemaRegistryUrl) {
    const subjects = [];
    return {
      totalSubjects: subjects.length,
      subjects,
      generatedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Format catalog as Markdown
   */
  static formatAsMarkdown(catalog) {
    const lines = [];
    lines.push("# Schema Registry Catalog");
    lines.push("");
    lines.push(`**Total Subjects**: ${catalog.totalSubjects}`);
    lines.push(`**Generated**: ${catalog.generatedAt.toISOString()}`);
    lines.push("");
    for (const subject of catalog.subjects) {
      lines.push(`## ${subject.subject}`);
      lines.push("");
      lines.push(`**Latest Version**: ${subject.latestVersion}`);
      lines.push(`**Compatibility Mode**: ${subject.compatibility}`);
      lines.push("");
      lines.push("### Versions");
      lines.push("");
      lines.push("| Version | Schema ID | Type |");
      lines.push("|---------|-----------|------|");
      for (const version of subject.versions) {
        lines.push(`| ${version.version} | ${version.id} | ${version.schemaType} |`);
      }
      lines.push("");
      const latestVersion = subject.versions[subject.versions.length - 1];
      if (latestVersion) {
        lines.push("### Latest Schema");
        lines.push("");
        lines.push("```json");
        lines.push(latestVersion.schema);
        lines.push("```");
        lines.push("");
      }
    }
    return lines.join("\n");
  }
  /**
   * Format catalog as JSON
   */
  static formatAsJSON(catalog) {
    return JSON.stringify(catalog, null, 2);
  }
}
var schema_catalog_generator_default = SchemaCatalogGenerator;
export {
  SchemaCatalogGenerator,
  schema_catalog_generator_default as default
};
