# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in ts-ping, please report it responsibly:

### How to Report

1. **Do not** open a public issue for security vulnerabilities
2. Send an email to: [hammeradam894@gmail.com] with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Status Updates**: Weekly until resolved
- **Fix Timeline**: Critical issues within 7 days, others within 30 days

### Security Considerations

ts-ping executes system commands (`ping`) and should be used with appropriate security considerations:

- **Input Validation**: Hostnames are passed to system commands
- **Command Injection**: The library validates inputs but always sanitize user input
- **Privilege Requirements**: Some ping operations may require elevated privileges
- **Network Access**: The library makes network requests to target hosts

### Best Practices

When using ts-ping:

1. **Validate Input**: Always validate hostnames from user input
2. **Rate Limiting**: Implement rate limiting for user-initiated pings
3. **Timeouts**: Use appropriate timeouts to prevent resource exhaustion
4. **Error Handling**: Handle errors gracefully without exposing system details

### Scope

This security policy covers:
- The ts-ping library code
- Dependencies and their known vulnerabilities
- Command execution security
- Input validation

Out of scope:
- Network infrastructure security
- Operating system vulnerabilities
- Third-party applications using ts-ping
