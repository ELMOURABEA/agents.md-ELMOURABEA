#!/usr/bin/env node

/**
 * Script to create issues in repositories using AGENTS.md
 * This allows notifying repositories about updates or best practices
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ISSUE_TITLE = process.env.ISSUE_TITLE || 'Update AGENTS.md format';
const ISSUE_BODY = process.env.ISSUE_BODY || 'Consider updating your AGENTS.md file';
const MAX_REPOS = parseInt(process.env.MAX_REPOS || '10', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';
const DATA_FILE = path.join(__dirname, '../data/tracked-repos.json');
const NOTIFIED_FILE = path.join(__dirname, '../data/notified-repos.json');

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
        'User-Agent': 'agents-md-notifier',
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
 * Load notified repositories
 */
function loadNotifiedRepos() {
  try {
    if (fs.existsSync(NOTIFIED_FILE)) {
      const data = fs.readFileSync(NOTIFIED_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading notified repos:', error.message);
  }
  return { repos: [] };
}

/**
 * Save notified repositories
 */
function saveNotifiedRepos(data) {
  try {
    const dataDir = path.dirname(NOTIFIED_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(NOTIFIED_FILE, JSON.stringify(data, null, 2));
    console.log(`Updated notified repositories log`);
  } catch (error) {
    console.error('Error saving notified repos:', error.message);
  }
}

/**
 * Create an issue in a repository
 */
async function createIssue(repoFullName, title, body) {
  try {
    const [owner, repo] = repoFullName.split('/');
    
    console.log(`Creating issue in ${repoFullName}...`);
    
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would create issue: "${title}"`);
      return { success: true, dryRun: true };
    }

    const response = await makeGitHubRequest(
      `/repos/${owner}/${repo}/issues`,
      'POST',
      {
        title: title,
        body: body,
      }
    );
    
    console.log(`  ✅ Issue created: ${response.data.html_url}`);
    return { success: true, issueUrl: response.data.html_url };
  } catch (error) {
    console.error(`  ❌ Failed to create issue in ${repoFullName}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting issue creation process...\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Max repositories: ${MAX_REPOS}`);
  console.log(`Issue title: "${ISSUE_TITLE}"`);
  console.log(`Issue body preview: ${ISSUE_BODY.substring(0, 100)}...\n`);

  // Load tracked repositories
  const trackedData = loadTrackedRepos();
  if (trackedData.repos.length === 0) {
    console.log('No tracked repositories found. Run check-agents-repos.js first.');
    return;
  }

  console.log(`Found ${trackedData.repos.length} tracked repositories\n`);

  // Load notified repositories to avoid duplicates
  const notifiedData = loadNotifiedRepos();
  const notifiedSet = new Set(notifiedData.repos.map(r => r.fullName));

  // Filter repositories that haven't been notified
  const reposToNotify = trackedData.repos
    .filter(repo => !notifiedSet.has(repo.fullName))
    .slice(0, MAX_REPOS);

  if (reposToNotify.length === 0) {
    console.log('All repositories have already been notified. No action needed.');
    return;
  }

  console.log(`Will create issues in ${reposToNotify.length} repositories:\n`);
  
  const results = [];
  
  for (const repo of reposToNotify) {
    const result = await createIssue(repo.fullName, ISSUE_TITLE, ISSUE_BODY);
    
    results.push({
      fullName: repo.fullName,
      notifiedAt: new Date().toISOString(),
      ...result,
    });
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Update notified repositories list
  if (!DRY_RUN) {
    const newNotifiedData = {
      repos: [...notifiedData.repos, ...results.filter(r => r.success)],
      lastRun: new Date().toISOString(),
    };
    saveNotifiedRepos(newNotifiedData);
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
    console.log('\n⚠️  This was a DRY RUN. No issues were actually created.');
    console.log('Set DRY_RUN=false to create real issues.');
  } else {
    console.log('\n✅ Issues created successfully!');
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

module.exports = { createIssue };
