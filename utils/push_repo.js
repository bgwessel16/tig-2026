import { spawn, execSync } from 'child_process';
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

function approveCredentials() {
    return new Promise((resolve, reject) => {
        console.log('Registering credentials with git-credential...');
        const gitCred = spawn('git', ['credential', 'approve']);

        gitCred.stdin.write('protocol=https\n');
        gitCred.stdin.write('host=github.com\n');
        gitCred.stdin.write(`username=${username}\n`);
        gitCred.stdin.write(`password=${token}\n\n`);
        gitCred.stdin.end();

        gitCred.on('close', (code) => {
            if (code === 0) {
                console.log('Credentials successfully registered.');
                resolve();
            } else {
                reject(new Error(`git credential approve failed with code ${code}`));
            }
        });
    });
}

function pushMain() {
    return new Promise((resolve, reject) => {
        console.log('Pushing main branch to github remote...');
        const gitPush = spawn('git', ['push', '-u', 'github', 'main'], {
            stdio: 'inherit'
        });

        gitPush.on('close', (code) => {
            if (code === 0) {
                console.log('Push completed successfully.');
                resolve();
            } else {
                reject(new Error(`git push failed with code ${code}`));
            }
        });
    });
}

function hasChangesToCommit() {
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (!status) return false;
    const lines = status.split('\n');
    return lines.some(line => !line.startsWith('??'));
}

function getCurrentBranch() {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
}

async function run() {
    let originalBranch = '';
    try {
        // 1. git commit -a -m "push_commit"
        console.log('Checking for changes to commit...');
        if (hasChangesToCommit()) {
            console.log('Committing changes...');
            execSync('git commit -a -m "push_commit"', { stdio: 'inherit' });
        } else {
            console.log('No tracked changes to commit.');
        }

        // 2. Remember current my_branch
        originalBranch = getCurrentBranch();
        console.log(`Current branch is: ${originalBranch}`);

        // 3. Register credentials
        await approveCredentials();

        // 4. git checkout main
        console.log('Checking out main branch...');
        execSync('git checkout main', { stdio: 'inherit' });

        // 5. git merge my_branch
        console.log(`Merging branch ${originalBranch} into main...`);
        execSync(`git merge ${originalBranch}`, { stdio: 'inherit' });

        // 6. git push github main
        await pushMain();

    } catch (error) {
        console.error('Error during execution:', error.message);
    } finally {
        // 7. git checkout my_branch
        if (originalBranch) {
            try {
                console.log(`Returning to branch: ${originalBranch}...`);
                execSync(`git checkout ${originalBranch}`, { stdio: 'inherit' });
            } catch (checkoutError) {
                console.error(`Failed to return to branch ${originalBranch}:`, checkoutError.message);
            }
        }
    }
}

run();
