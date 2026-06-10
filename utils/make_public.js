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
        console.error("Error reading secrets.txt:", err.message);
        process.exit(1);
    }
}

const token = getSecretValue('github_token');
const username = getSecretValue('username');
const repoName = getSecretValue('repo_name');

async function makeRepoPublic() {
    console.log(`Updating repository visibility to PUBLIC for: ${repoName}`);
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Antigravity-Agent'
            },
            body: JSON.stringify({
                private: false
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Successfully updated repository visibility to PUBLIC!');
            console.log('Repository URL:', data.html_url);
            console.log('Private status:', data.private);
        } else {
            console.error('Failed to update repository:', response.status, response.statusText, data);
        }
    } catch (error) {
        console.error('Error updating repository:', error);
    }
}

makeRepoPublic();

