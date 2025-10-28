# AGENTS.md Repository Monitoring System

This system helps monitor repositories that use AGENTS.md and allows for outreach to those repositories.

## Features

- **Repository Discovery**: Automatically searches GitHub for repositories using AGENTS.md
- **Update Tracking**: Monitors tracked repositories for updates
- **Issue Creation**: Creates issues in repositories to notify about updates or best practices
- **Pull Request Creation**: Guidance for creating pull requests with AGENTS.md updates

## Workflows

### 1. Check AGENTS.md Repositories
**File**: `.github/workflows/check-agents-repos.yml`

Runs daily (or can be manually triggered) to:
- Search for repositories with AGENTS.md files
- Track new repositories
- Check for updates in existing tracked repositories

**Environment Variables**:
- `GITHUB_TOKEN`: Required for GitHub API access (automatically provided by GitHub Actions)

### 2. Create Issues for AGENTS.md Updates
**File**: `.github/workflows/create-issues.yml`

Manually triggered workflow to create issues in tracked repositories.

**Inputs**:
- `issue_title`: Title for the issue (default: "Update AGENTS.md format")
- `issue_body`: Body content for the issue
- `max_repos`: Maximum number of repositories to create issues in (default: 10)
- `dry_run`: Set to 'true' for testing without creating actual issues (default: true)

### 3. Create Pull Requests for AGENTS.md Updates
**File**: `.github/workflows/create-pull-requests.yml`

Manually triggered workflow to create pull requests in tracked repositories.

**Inputs**:
- `pr_title`: Title for the pull request (default: "Update AGENTS.md format")
- `pr_body`: Body content for the pull request
- `branch_name`: Branch name to create (default: "update-agents-md")
- `file_content`: New AGENTS.md content (optional)
- `max_repos`: Maximum number of repositories to process (default: 5)
- `dry_run`: Set to 'true' for testing without creating actual PRs (default: true)

**Note**: Creating pull requests requires repository forks and proper authentication. The script provides guidance for manual PR creation.

## Scripts

### check-agents-repos.js

Searches GitHub for repositories with AGENTS.md files and tracks their information.

**Usage**:
```bash
GITHUB_TOKEN=your_token node scripts/check-agents-repos.js
```

**Output**:
- Creates/updates `data/tracked-repos.json` with repository information

### create-issues.js

Creates issues in tracked repositories with customizable content.

**Usage**:
```bash
GITHUB_TOKEN=your_token \
ISSUE_TITLE="Your Issue Title" \
ISSUE_BODY="Your issue body content" \
MAX_REPOS=10 \
DRY_RUN=true \
node scripts/create-issues.js
```

**Environment Variables**:
- `GITHUB_TOKEN`: Required for GitHub API access
- `ISSUE_TITLE`: Title for the issue to create
- `ISSUE_BODY`: Body content for the issue
- `MAX_REPOS`: Maximum number of repositories to create issues in
- `DRY_RUN`: Set to 'true' to test without creating actual issues

**Output**:
- Creates/updates `data/notified-repos.json` to track which repositories have been notified

### create-pull-requests.js

Provides guidance for creating pull requests in tracked repositories.

**Usage**:
```bash
GITHUB_TOKEN=your_token \
PR_TITLE="Your PR Title" \
PR_BODY="Your PR body content" \
BRANCH_NAME="update-agents-md" \
MAX_REPOS=5 \
DRY_RUN=true \
node scripts/create-pull-requests.js
```

**Environment Variables**:
- `GITHUB_TOKEN`: Required for GitHub API access
- `PR_TITLE`: Title for the pull request
- `PR_BODY`: Body content for the pull request
- `BRANCH_NAME`: Branch name to create
- `FILE_CONTENT`: Optional new AGENTS.md content
- `MAX_REPOS`: Maximum number of repositories to process
- `DRY_RUN`: Set to 'true' to test without attempting PR creation

**Output**:
- Creates/updates `data/created-prs.json` to track PR creation attempts
- Provides manual instructions for completing PR creation

## Data Files

The system stores data in the `data/` directory (gitignored):

- `tracked-repos.json`: List of all repositories found with AGENTS.md
- `notified-repos.json`: List of repositories that have received issues/notifications
- `created-prs.json`: List of repositories where PR creation was attempted

## Manual Usage

### Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your GitHub token:
   ```bash
   export GITHUB_TOKEN=your_github_token_here
   ```

3. Run the checker:
   ```bash
   node scripts/check-agents-repos.js
   ```

4. Create issues (dry run first):
   ```bash
   DRY_RUN=true node scripts/create-issues.js
   ```

5. Create real issues (when ready):
   ```bash
   DRY_RUN=false node scripts/create-issues.js
   ```

## GitHub Actions Usage

### Trigger Check Workflow
Go to Actions → Check AGENTS.md Repositories → Run workflow

### Trigger Issue Creation
Go to Actions → Create Issues for AGENTS.md Updates → Run workflow
- Fill in the issue title and body
- Set max_repos as needed
- Use dry_run=true for testing
- Set dry_run=false to create real issues

## Best Practices

1. **Always use dry run first**: Test your issue content with `DRY_RUN=true` before creating real issues
2. **Rate limiting**: The scripts include delays to avoid GitHub API rate limits
3. **Monitoring**: Review the tracked repositories regularly to ensure accurate data
4. **Issue content**: Make sure issue content is helpful and relevant before bulk creation

## Security

- Never commit the `GITHUB_TOKEN` to the repository
- The `data/` directory is gitignored to prevent accidental commits of repository data
- Use GitHub Actions secrets for production workflows

## Troubleshooting

### Rate Limiting
If you hit GitHub API rate limits:
- Wait for the rate limit to reset
- Reduce `MAX_REPOS` when creating issues
- Use authentication (GITHUB_TOKEN) for higher limits

### No Repositories Found
- Ensure your GITHUB_TOKEN has proper permissions
- Check if the GitHub API is accessible from your network
- Verify the search query is correct

## Future Enhancements

Potential improvements:
- Add pull request creation capability
- More sophisticated tracking of repository states
- Email notifications for repository updates
- Dashboard for viewing tracked repositories
- Filtering repositories by language or activity
