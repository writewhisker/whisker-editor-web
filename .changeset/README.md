# Changesets

This directory contains changesets for version management.

## Creating a changeset

When you make changes that require a version bump:

```bash
pnpm changeset
```

Follow the prompts to:
1. Select which packages changed
2. Choose the type of change (major, minor, patch)
3. Write a summary of the changes

## Versioning packages

To apply changesets and update package versions:

```bash
pnpm version-packages
```

This will:
- Update package.json versions
- Update CHANGELOG.md files
- Update dependencies between workspace packages

## Publishing

To publish packages to npm:

```bash
pnpm release
```

This will:
- Build all packages
- Publish to npm
- Create git tags

## Semantic Versioning

- **Major (X.0.0)**: Breaking changes to public API
- **Minor (0.X.0)**: New features, backward compatible
- **Patch (0.0.X)**: Bug fixes, backward compatible
