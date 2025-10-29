#!/usr/bin/env node

/**
 * Script to create pull requests in repositories using AGENTS.md
 * This allows proposing updates to AGENTS.md files across multiple repositories
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_TITLE = process.env.PR_TITLE || 'Update AGENTS.md format';
const PR_BODY = process.env.PR_BODY || 'Update AGENTS.md to follow best practices';
const BRANCH_NAME = process.env.BRANCH_NAME || 'update-agents-md';
const FILE_CONTENT = process.env.FILE_CONTENT || '';
const MAX_REPOS = parseInt(process.env.MAX_REPOS || '5', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';
const DATA_FILE = path.join(__dirname, '../data/tracked-repos.json');
const PR_LOG_FILE = path.join(__dirname, '../data/created-prs.json');

/**
 * Make a GitHub API request
 */
function makeGitHubRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: method,
      headers: {
        'User-Agent': 'agents-md-pr-creator',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    if (GITHUB_TOKEN) {
      options.headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }

    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            data: body ? JSON.parse(body) : {},
            headers: res.headers,
            statusCode: res.statusCode
          });
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Load tracked repositories
 */
function loadTrackedRepos() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading tracked repos:', error.message);
  }
  return { repos: [] };
}

/**
 * Load PR log
 */
function loadPRLog() {
  try {
    if (fs.existsSync(PR_LOG_FILE)) {
      const data = fs.readFileSync(PR_LOG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading PR log:', error.message);
  }
  return { prs: [] };
}

/**
 * Save PR log
 */
function savePRLog(data) {
  try {
    const dataDir = path.dirname(PR_LOG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(PR_LOG_FILE, JSON.stringify(data, null, 2));
    console.log(`Updated PR log`);
  } catch (error) {
    console.error('Error saving PR log:', error.message);
  }
}

/**
 * Get default branch of a repository
 */
async function getDefaultBranch(repoFullName) {
  try {
    const [owner, repo] = repoFullName.split('/');
    const response = await makeGitHubRequest(`/repos/${owner}/${repo}`);
    return response.data.default_branch || 'main';
  } catch (error) {
    console.error(`Error getting default branch for ${repoFullName}:`, error.message);
    return 'main';
  }
}

/**
 * Create a pull request in a repository
 * Note: This is a simplified version. In practice, you would need to:
 * 1. Fork the repository (or have write access)
 * 2. Create a new branch
 * 3. Make changes to files
 * 4. Create the PR
 * 
 * For security and practical reasons, this script only simulates the process
 * and provides guidance on how to create PRs manually or with proper auth.
 */
async function createPullRequest(repoFullName, title, body, branchName) {
  try {
    const [owner, repo] = repoFullName.split('/');
    
    console.log(`Creating PR in ${repoFullName}...`);
    
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would create PR: "${title}"`);
      console.log(`  [DRY RUN] Branch: ${branchName}`);
      console.log(`  [DRY RUN] Target: ${owner}/${repo}`);
      return { success: true, dryRun: true };
    }

    // Note: Creating actual PRs requires:
    // 1. Forking the repository or having write access
    // 2. Creating a branch with changes
    // 3. Pushing the branch
    // 4. Creating the PR via API
    // This is complex and requires proper authentication and permissions
    
    console.log(`  ⚠️  PR creation requires forking and authentication.`);
    console.log(`  Manual steps:`);
    console.log(`    1. Fork ${owner}/${repo}`);
    console.log(`    2. Create branch: ${branchName}`);
    console.log(`    3. Update AGENTS.md file`);
    console.log(`    4. Create PR with title: "${title}"`);
    
    return { 
      success: true, 
      manual: true,
      instructions: `Fork ${owner}/${repo} and create PR manually`
    };
  } catch (error) {
    console.error(`  ❌ Error processing ${repoFullName}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting pull request creation process...\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Max repositories: ${MAX_REPOS}`);
  console.log(`PR title: "${PR_TITLE}"`);
  console.log(`Branch name: "${BRANCH_NAME}"`);
  console.log(`PR body preview: ${PR_BODY.substring(0, 100)}...\n`);

  // Load tracked repositories
  const trackedData = loadTrackedRepos();
  if (trackedData.repos.length === 0) {
    console.log('No tracked repositories found. Run check-agents-repos.js first.');
    return;
  }

  console.log(`Found ${trackedData.repos.length} tracked repositories\n`);

  // Load PR log to avoid duplicates
  const prLog = loadPRLog();
  const prSet = new Set(prLog.prs.map(p => p.fullName));

  // Filter repositories that haven't received PRs
  const reposForPR = trackedData.repos
    .filter(repo => !prSet.has(repo.fullName))
    .slice(0, MAX_REPOS);

  if (reposForPR.length === 0) {
    console.log('All repositories have already received PRs. No action needed.');
    return;
  }

  console.log(`Will create PRs in ${reposForPR.length} repositories:\n`);
  
  const results = [];
  
  for (const repo of reposForPR) {
    const result = await createPullRequest(
      repo.fullName, 
      PR_TITLE, 
      PR_BODY,
      BRANCH_NAME
    );
    
    results.push({
      fullName: repo.fullName,
      processedAt: new Date().toISOString(),
      ...result,
    });
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Update PR log
  if (!DRY_RUN) {
    const newPRLog = {
      prs: [...prLog.prs, ...results.filter(r => r.success)],
      lastRun: new Date().toISOString(),
    };
    savePRLog(newPRLog);
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`Total processed: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No PRs were actually created.');
    console.log('Set DRY_RUN=false to attempt real PR creation.');
  } else {
    console.log('\n✅ PR creation process completed!');
    console.log('\n⚠️  Note: Actual PR creation requires repository forks and proper authentication.');
    console.log('Follow the manual instructions provided above for each repository.');
  }
}

// Run the script
if (require.main === module) {
  if (!GITHUB_TOKEN) {
    console.error('Error: GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createPullRequest };
