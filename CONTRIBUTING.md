# Contributing to ts-ping

Thank you for your interest in contributing to ts-ping! This document provides guidelines and information for contributors.

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher (recommended) or npm
- TypeScript 5+
- macOS or Linux (for testing ping functionality)

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/hammeradam/ts-ping.git
   cd ts-ping
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Run tests to ensure everything works:
   ```bash
   pnpm test
   ```

## Development Workflow

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

### Building

```bash
pnpm run build
```

### Linting

```bash
# Check for issues
pnpm run lint

# Fix automatically fixable issues
pnpm run lint:fix
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-ipv6-support`
- `fix/timeout-handling`
- `docs/update-readme`

### Commit Messages

Follow conventional commit format:
- `feat: add IPv6 support`
- `fix: handle timeout edge cases`
- `docs: update API documentation`
- `test: add async ping tests`

### Code Standards

- **TypeScript**: All code must be properly typed
- **Testing**: New features require comprehensive tests
- **Documentation**: Update README and JSDoc comments
- **Linting**: Code must pass ESLint checks

### Testing Requirements

- Maintain or improve test coverage (currently 94%+)
- Add unit tests for new functionality
- Add integration tests for new features
- Ensure all existing tests continue to pass

## Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following the code standards
3. **Add/update tests** for your changes
4. **Update documentation** if needed
5. **Run the full test suite** and ensure it passes
6. **Submit a pull request** with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots/examples if applicable

### Pull Request Checklist

- [ ] Tests pass locally (`pnpm test`)
- [ ] Code builds successfully (`pnpm run build`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Documentation updated if needed
- [ ] New functionality includes tests
- [ ] Breaking changes are documented

## Types of Contributions

### Bug Reports

When reporting bugs, please include:
- Operating system and version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Minimal code example

### Feature Requests

For new features:
- Describe the use case
- Explain why it belongs in ts-ping
- Consider backwards compatibility
- Provide implementation ideas if possible

### Documentation

Documentation improvements are always welcome:
- Fix typos or unclear sections
- Add examples
- Improve API documentation
- Update outdated information

## Code Architecture

### Key Components

- **`Ping` class**: Main interface with fluent API
- **`PingResult` classes**: Type-safe result handling with discriminated unions
- **`PingResultLine`**: Individual ping response parsing
- **Error handling**: Comprehensive error types and detection

### Design Principles

- **Type Safety**: Leverage TypeScript's type system
- **Immutability**: Readonly properties where possible
- **Fluent Interface**: Method chaining for configuration
- **Cross-Platform**: Support both macOS and Linux
- **Async Support**: Both sync and async execution modes

## Release Process

Releases are automated via GitHub Actions when code is pushed to `main`:

1. Tests run on CI
2. Package is built
3. Published to npm automatically

## Questions?

If you have questions about contributing:
- Open an issue for discussion
- Check existing issues and PRs
- Review this contributing guide

Thank you for contributing to ts-ping!
