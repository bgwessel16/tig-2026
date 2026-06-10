import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getSecretValue(val) {
  try {
    const secretsPath = path.join(__dirname, '..', 'secrets.txt');
    const content = fs.readFileSync(secretsPath, 'utf8');
    const match = content.match(new RegExp(`${val}\\s*=\\s*['"]?([^'\\s\\n\\r"]+)['"]?`));
    if (match && match[1]) {
      return match[1];
    }
    throw new Error(`Could not find ${val} pattern in secrets.txt`);
  } catch (err) {
    console.error('Error reading secrets.txt:', err.message);
    process.exit(1);
  }
}

const token = getSecretValue('github_token');
const owner = getSecretValue('username');
const repo = getSecretValue('repo_name');

function printUsage() {
  console.log('Usage: node utils/add_collaborator.js <collaborator> [permission]');
  console.log('  <collaborator>  GitHub username or team slug to add as collaborator');
  console.log('  [permission]    Optional permission: pull, push, or admin (default: push)');
}

async function addCollaborator(username, permission = 'push') {
  const validPermissions = ['pull', 'push', 'admin'];
  if (!validPermissions.includes(permission)) {
    throw new Error(`Invalid permission: ${permission}. Valid values are: ${validPermissions.join(', ')}`);
  }

  console.log(`Adding collaborator ${username} to ${owner}/${repo} with permission ${permission}...`);

  const url = `https://api.github.com/repos/${owner}/${repo}/collaborators/${encodeURIComponent(username)}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Antigravity-Agent'
    },
    body: JSON.stringify({ permission })
  });

  const data = await response.json();
  if (response.ok) {
    console.log(`Successfully invited ${username} to ${owner}/${repo}.`);
    if (data.html_url) {
      console.log(`Invitation URL: ${data.html_url}`);
    }
    return;
  }

  console.error('Failed to add collaborator:', response.status, response.statusText);
  console.error(data);
  process.exit(1);
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    printUsage();
    process.exit(1);
  }

  const [collaborator, permission] = args;
  await addCollaborator(collaborator, permission ?? 'push');
}

run().catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
