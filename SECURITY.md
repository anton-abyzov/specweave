# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.7.x   | :white_check_mark: |
| 0.6.x   | :white_check_mark: |
| 0.5.x   | :x:                |
| < 0.5   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to anton.abyzov@gmail.com.

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Security Updates

Security updates will be released as patch versions (e.g., 0.7.1) and announced through:

1. GitHub Security Advisories
2. Release notes in CHANGELOG.md
3. GitHub Discussions (Security category)

## Vulnerability Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible

## Known Security Considerations

### Command Injection

SpecWeave executes shell commands via hooks and CLI operations. We take the following precautions:

- All user input is sanitized before being passed to shell commands
- Hook scripts are only loaded from trusted sources (.claude/hooks/ directory)
- File paths are validated to prevent directory traversal attacks

### Plugin Security

SpecWeave's plugin system can execute arbitrary code. Security considerations:

- Plugins are opt-in (user must explicitly install)
- Core plugin is bundled and audited with each release
- External plugins should be reviewed before installation
- Plugin marketplace sources are verified

### Credential Management

SpecWeave may interact with external services (GitHub, JIRA, etc.):

- Credentials are stored using system keychain when possible
- Environment variables are preferred over config files
- Secrets are never logged or committed to git
- API tokens should use minimal required scopes

## Best Practices for Users

1. **Keep SpecWeave Updated**: Always use the latest version
2. **Review Plugins**: Audit plugin source code before installation
3. **Protect Credentials**: Use environment variables or keychain for sensitive data
4. **Review Hooks**: Inspect hook scripts before enabling them
5. **Minimal Permissions**: Grant only necessary permissions to external integrations

## Security Acknowledgments

We would like to thank the following individuals for responsibly disclosing security vulnerabilities:

- (None reported yet)

---

**Last Updated**: 2025-11-04
