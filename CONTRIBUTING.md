# Contributing to Kabon

Thank you for your interest in contributing to Kabon! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Yarn (for contracts workspace)
- Bun (for web and indexers workspaces)
- Git

### Setting Up Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/arbs-london.git
   cd arbs-london
   ```
3. Install dependencies for each workspace:
   ```bash
   # Contracts
   cd contracts
   yarn install

   # Web
   cd ../web
   bun install

   # Indexers
   cd ../indexers/kabon-vault
   bun install
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
   ```

2. Make your changes following the coding standards below

3. Test your changes thoroughly

4. Commit your changes with a clear message:
   ```bash
   git commit -m "feat: add new feature description"
   # or
   git commit -m "fix: resolve issue description"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a pull request

## Pull Request Process

1. Ensure your PR description clearly describes the problem and solution
2. Include the relevant issue number if applicable (e.g., "Fixes #123")
3. Update documentation as needed
4. Ensure all tests pass
5. Request review from maintainers

### PR Checklist

- [ ] Code follows the project's coding standards
- [ ] Tests have been added/updated and pass
- [ ] Documentation has been updated
- [ ] Commit messages follow conventional commit format
- [ ] PR description clearly explains the changes

## Coding Standards

### General Guidelines

- Write clear, self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Follow existing code style in each workspace

### Smart Contracts (contracts/)

- Follow Solidity best practices
- Use NatSpec comments for all public functions
- Write comprehensive tests for all contract logic
- Use Hardhat for development and testing

### Frontend (web/)

- Follow React and Next.js best practices
- Use TypeScript for type safety
- Follow the existing component structure
- Ensure responsive design

### Indexers (indexers/)

- Follow The Graph best practices
- Write efficient GraphQL queries
- Document schema changes

## Testing

### Contracts

```bash
cd contracts
npx hardhat test
```

### Web

```bash
cd web
bun run test
```

### Indexers

```bash
cd indexers/kabon-vault
graph test
```

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Environment details (OS, Node.js version, etc.)
- Screenshots or logs if applicable

Use the provided issue templates when creating new issues.

## Questions?

Feel free to open an issue with the "question" label if you have any questions about contributing or the project itself.
