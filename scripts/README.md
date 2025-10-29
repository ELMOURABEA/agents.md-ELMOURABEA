# Scripts Directory

This directory contains automation scripts for monitoring and engaging with repositories that use AGENTS.md.

## Scripts

### check-agents-repos.js
Discovers and tracks repositories using AGENTS.md on GitHub.

**Purpose**: Automatically finds repositories with AGENTS.md files and maintains a database of tracked repositories.

**When to use**: Run daily via GitHub Actions or manually to update the repository database.

### create-issues.js
Creates issues in tracked repositories.

**Purpose**: Notify repository owners about AGENTS.md updates, best practices, or new features.

**When to use**: Manually trigger when you want to reach out to repositories with specific information.

### create-pull-requests.js
Provides guidance for creating pull requests in tracked repositories.

**Purpose**: Helps coordinate pull requests that propose AGENTS.md improvements across multiple repositories.

**When to use**: When you want to propose specific changes to AGENTS.md files (requires forking and manual completion).

## Common Usage Patterns

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Set GitHub token
export GITHUB_TOKEN=your_github_token

# Discover repositories
node scripts/check-agents-repos.js
```

### 2. Sending Notifications
```bash
# Test with dry run
DRY_RUN=true \
ISSUE_TITLE="AGENTS.md Best Practices" \
ISSUE_BODY="$(cat templates/issue-best-practices.md)" \
node scripts/create-issues.js

# Send to first 10 repositories
DRY_RUN=false MAX_REPOS=10 \
ISSUE_TITLE="AGENTS.md Best Practices" \
ISSUE_BODY="$(cat templates/issue-best-practices.md)" \
node scripts/create-issues.js
```

### 3. Coordinating Pull Requests
```bash
# Get guidance for PR creation
DRY_RUN=true \
PR_TITLE="Update AGENTS.md format" \
PR_BODY="$(cat templates/pr-format-update.md)" \
node scripts/create-pull-requests.js
```

## Safety Features

All scripts include:
- **Dry run mode**: Test without making real changes
- **Rate limiting**: Automatic delays to respect GitHub API limits
- **Duplicate prevention**: Tracks which repositories have been contacted
- **Batch limits**: Control how many repositories to process at once

## Data Persistence

Scripts store data in the `../data/` directory (which is automatically created when scripts run):
- Tracked repositories
- Notification history
- PR creation logs

This prevents duplicate notifications and maintains state across runs. The `data/` directory is in `.gitignore` to keep runtime data out of version control.

## Error Handling

Scripts handle common errors gracefully:
- API rate limit errors
- Network timeouts
- Invalid repository data
- Authentication failures

Check script output for detailed error messages and troubleshooting steps.

## Best Practices

1. **Always test first**: Use `DRY_RUN=true` before real operations
2. **Start small**: Use `MAX_REPOS` to limit batch size initially
3. **Review templates**: Customize issue/PR templates before sending
4. **Monitor rate limits**: Check your GitHub API rate limit status
5. **Be respectful**: Don't spam repositories with unnecessary notifications

## GitHub Actions Integration

These scripts are designed to work with GitHub Actions workflows in `.github/workflows/`:
- `check-agents-repos.yml`: Runs the checker daily
- `create-issues.yml`: Manual trigger for issue creation
- `create-pull-requests.yml`: Manual trigger for PR guidance

See `../MONITORING.md` for complete documentation on the monitoring system.
