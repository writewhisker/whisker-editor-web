# Security Policy

## Supported Versions

We actively support the following versions of whisker-editor-web with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.x     | :white_check_mark: |

**Note:** Currently in pre-1.0 development. Once we release version 1.0, we will maintain security support for the latest major version and the previous major version for 12 months.

## Reporting a Vulnerability

We take the security of whisker-editor-web seriously. If you discover a security vulnerability, please follow these guidelines:

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities through one of these methods:

#### Option 1: GitHub Security Advisories (Preferred)

1. Go to https://github.com/writewhisker/whisker-editor-web/security/advisories
2. Click "Report a vulnerability"
3. Fill out the form with details about the vulnerability

#### Option 2: Email

Send an email to: **security@writewhisker.org** (when available)

Until the dedicated security email is set up, please use GitHub Security Advisories.

### What to Include

Please provide the following information in your report:

1. **Description**: A clear description of the vulnerability
2. **Impact**: What kind of security issue is this? (XSS, CSRF, data leak, etc.)
3. **Affected Versions**: Which versions are affected?
4. **Reproduction Steps**: Detailed steps to reproduce the vulnerability
5. **Proof of Concept**: Screenshots or video demonstrating the issue
6. **Browser & OS**: Where was this reproduced?
7. **Suggested Fix**: If you have ideas on how to fix it (optional)

### Example Report

```
Title: XSS Vulnerability in Passage Name Field

Description:
Passage names with HTML/JavaScript are not properly escaped in the passage
list view, allowing arbitrary script execution.

Impact:
Cross-Site Scripting (XSS) - Medium Severity

Affected Versions:
0.1.0 and earlier

Reproduction Steps:
1. Create a new passage
2. Name it: `<img src=x onerror=alert('XSS')>`
3. View the passage list
4. Observe that the alert executes

Proof of Concept:
[Screenshot showing alert dialog]

Browser: Chrome 120 on macOS 14

Suggested Fix:
Properly escape passage names using DOMPurify or Svelte's text binding.
```

## Security Vulnerability Categories

### Critical (Immediate attention required)

- **Stored XSS**: JavaScript execution via stored content (passage names, content)
- **Remote Code Execution**: Arbitrary code execution in browser context
- **Authentication Bypass**: Unauthorized access to protected features
- **Data Exfiltration**: Stealing user's story data

### High

- **Reflected XSS**: JavaScript execution via URL parameters
- **CSRF**: Cross-site request forgery for state-changing operations
- **Local Storage Poisoning**: Malicious data in browser storage
- **Prototype Pollution**: Modifying JavaScript object prototypes

### Medium

- **DOM-based XSS**: Client-side JavaScript vulnerabilities
- **Open Redirect**: Redirecting users to malicious sites
- **Information Disclosure**: Leaking user data or system information
- **Insufficient Input Validation**: Missing or weak input sanitization

### Low

- **Minor Information Leaks**: Limited information exposure
- **Best Practice Violations**: Security concerns that don't directly lead to exploits
- **Missing Security Headers**: CSP, HSTS, etc.

## Response Timeline

We aim to respond to security reports according to the following timeline:

- **Initial Response**: Within 48 hours of receiving the report
- **Severity Assessment**: Within 1 week
- **Fix Development**: Depends on severity
  - Critical: Within 1 week
  - High: Within 2 weeks
  - Medium: Within 4 weeks
  - Low: Next regular release
- **Public Disclosure**: After fix is released and deployed

## Security Best Practices for Users

### When Using whisker-editor-web

1. **Use HTTPS**: Always access the editor over HTTPS
2. **Keep Browser Updated**: Use the latest version of your browser
3. **Don't Share Story Files**: Your stories may contain sensitive content
4. **Review Imported Stories**: Be cautious when importing stories from others
5. **Use Strong Passwords**: If authentication is added in the future
6. **Clear Browser Data**: Periodically clear browser storage if on shared computers

### For Story Authors

1. **Sanitize User Input**: If your stories collect user input, validate it
2. **Avoid Sensitive Data**: Don't include personal information, API keys, or credentials
3. **Test Before Sharing**: Test your stories before distributing them
4. **Review External Links**: Ensure links in your stories are trustworthy

### For Self-Hosting

If you're hosting whisker-editor-web yourself:

1. **Use HTTPS**: Configure TLS/SSL certificates
2. **Set Security Headers**: Configure CSP, HSTS, X-Frame-Options
3. **Keep Updated**: Deploy security updates promptly
4. **Monitor Access**: Log and review access patterns
5. **Backup Regularly**: Ensure you can restore from clean backups
6. **Implement Rate Limiting**: Prevent abuse and DoS

## Known Security Considerations

### Client-Side Storage

whisker-editor-web stores stories in browser localStorage:

- **No Server**: Stories are stored locally, not on a server
- **Same Origin**: Only accessible by the same origin (protocol + domain + port)
- **No Encryption**: localStorage is not encrypted by default
- **Persistence**: Data persists until explicitly cleared

**Mitigation**:
- Don't store sensitive information in stories
- Use private browsing for sensitive work
- Clear browser data when using shared computers

### Browser Security

The editor runs in the browser and relies on browser security:

- **XSS Protection**: We use Svelte's automatic escaping
- **Content Security Policy**: We'll implement CSP headers
- **Subresource Integrity**: We use SRI for CDN resources
- **HTTPS Only**: Deployed sites should use HTTPS

### Import/Export

Story files can be imported:

- **Validate Imports**: We validate story file structure
- **Sanitize Content**: Passage content is sanitized before display
- **No Arbitrary Code**: Story files don't execute arbitrary code in the editor

### AGPLv3 Section 13 Compliance

If you deploy a modified version as a network service:

- **Source Disclosure**: You must provide source code access
- **Modification Notice**: You must indicate modifications
- **License Preservation**: Modifications must remain AGPLv3+

This is a **legal requirement**, not optional. See [NOTICE](NOTICE) for details.

## Security Updates

Security updates will be released as:

1. **Patch Releases**: For critical and high severity issues (e.g., 0.1.1)
2. **GitHub Security Advisories**: Public disclosure after fix is deployed
3. **CHANGELOG.md**: Documented with `[SECURITY]` prefix
4. **Release Notes**: Highlighted in GitHub releases
5. **GitHub Pages**: Automatic deployment of fixed version

## Security Features

### Implemented

- ✅ **Input Sanitization**: Svelte automatic escaping
- ✅ **Type Safety**: TypeScript prevents many injection attacks
- ✅ **Validation**: Story file structure validation
- ✅ **No Inline Scripts**: No use of `eval()` or `Function()`
- ✅ **Dependency Scanning**: GitHub Dependabot alerts

### Planned

- 📋 **Content Security Policy**: Strict CSP headers
- 📋 **Subresource Integrity**: SRI for all external resources
- 📋 **Security Headers**: HSTS, X-Frame-Options, etc.
- 📋 **Input Validation**: Enhanced validation for all user inputs
- 📋 **Audit Logging**: Log security-relevant actions

## Security Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities:

| Reporter | Vulnerability | Version Fixed |
|----------|---------------|---------------|
| _None yet_ | - | - |

Thank you to all researchers who help keep whisker-editor-web secure!

## Security Checklist for Developers

When contributing code, ensure:

- [ ] User input is validated and sanitized
- [ ] No use of `dangerouslySetInnerHTML` or equivalent
- [ ] No `eval()`, `Function()`, or similar dynamic code execution
- [ ] External URLs are validated before use
- [ ] localStorage data is validated before parsing
- [ ] TypeScript types are properly defined (no `any`)
- [ ] Dependencies are up to date
- [ ] HTTPS is enforced for external requests
- [ ] Error messages don't leak sensitive information
- [ ] Authentication/authorization is checked (when applicable)

## Dependencies

We regularly update dependencies to address security vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# View dependency tree
npm list
```

## Questions?

If you have questions about:
- **This security policy**: Open a GitHub Discussion
- **Security best practices**: See documentation or ask in Discussions
- **A potential vulnerability**: Follow the reporting process above

## License

This security policy is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
