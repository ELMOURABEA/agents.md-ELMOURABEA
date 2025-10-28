#!/usr/bin/env node

/**
 * Script to check repositories using AGENTS.md for updates
 * This script searches GitHub for repositories with AGENTS.md files
 * and tracks their updates
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DATA_FILE = path.join(__dirname, '../data/tracked-repos.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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
        'User-Agent': 'agents-md-checker',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    if (GITHUB_TOKEN) {
      options.headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            data: JSON.parse(body || '{}'),
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
 * Search for repositories with AGENTS.md files
 */
async function searchAgentsRepos() {
  console.log('Searching for repositories with AGENTS.md...');
  
  try {
    const response = await makeGitHubRequest(
      '/search/code?q=path:AGENTS.md+filename:AGENTS.md&per_page=100&sort=indexed'
    );
    
    const repos = response.data.items || [];
    console.log(`Found ${repos.length} repositories with AGENTS.md`);
    
    return repos.map(item => ({
      fullName: item.repository.full_name,
      url: item.repository.html_url,
      lastChecked: new Date().toISOString(),
      hasAgentsMd: true,
    }));
  } catch (error) {
    console.error('Error searching repositories:', error.message);
    return [];
  }
}

/**
 * Load previously tracked repositories
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
  return { repos: [], lastUpdate: null };
}

/**
 * Save tracked repositories
 */
function saveTrackedRepos(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`Saved ${data.repos.length} tracked repositories`);
  } catch (error) {
    console.error('Error saving tracked repos:', error.message);
  }
}

/**
 * Check for repository updates
 */
async function checkForUpdates(repoFullName) {
  try {
    const [owner, repo] = repoFullName.split('/');
    const response = await makeGitHubRequest(`/repos/${owner}/${repo}`);
    
    return {
      fullName: repoFullName,
      pushedAt: response.data.pushed_at,
      updatedAt: response.data.updated_at,
      stars: response.data.stargazers_count,
      description: response.data.description,
    };
  } catch (error) {
    console.error(`Error checking ${repoFullName}:`, error.message);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting AGENTS.md repository checker...\n');

  // Load existing tracked repositories
  const trackedData = loadTrackedRepos();
  console.log(`Currently tracking ${trackedData.repos.length} repositories\n`);

  // Search for repositories with AGENTS.md
  const foundRepos = await searchAgentsRepos();
  
  if (foundRepos.length === 0) {
    console.log('No repositories found. Exiting.');
    return;
  }

  // Merge with existing tracked repos
  const repoMap = new Map();
  
  // Add existing repos
  trackedData.repos.forEach(repo => {
    repoMap.set(repo.fullName, repo);
  });
  
  // Add/update with found repos
  foundRepos.forEach(repo => {
    const existing = repoMap.get(repo.fullName);
    if (existing) {
      repoMap.set(repo.fullName, { ...existing, ...repo });
    } else {
      repoMap.set(repo.fullName, repo);
    }
  });

  const updatedRepos = Array.from(repoMap.values());
  
  console.log(`\nTotal repositories tracked: ${updatedRepos.length}`);
  console.log(`New repositories found: ${updatedRepos.length - trackedData.repos.length}`);

  // Check for updates in a sample of repositories (limit to avoid rate limiting)
  console.log('\nChecking for updates in repositories...');
  const samplesToCheck = Math.min(10, updatedRepos.length);
  
  for (let i = 0; i < samplesToCheck; i++) {
    const repo = updatedRepos[i];
    console.log(`Checking ${repo.fullName}...`);
    
    const updateInfo = await checkForUpdates(repo.fullName);
    if (updateInfo) {
      updatedRepos[i] = { ...repo, ...updateInfo };
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Save updated data
  const newData = {
    repos: updatedRepos,
    lastUpdate: new Date().toISOString(),
    totalRepos: updatedRepos.length,
  };
  
  saveTrackedRepos(newData);

  console.log('\n✅ Repository check complete!');
  console.log(`Total repositories with AGENTS.md: ${updatedRepos.length}`);
  console.log(`Data saved to: ${DATA_FILE}`);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { searchAgentsRepos, checkForUpdates };
