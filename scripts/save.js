const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function generateCommitMessage() {
    if (!OPENROUTER_API_KEY) {
        console.warn('⚠️  OPENROUTER_API_KEY is not set. Using generic commit message.');
        return `feat: update project contents at ${new Date().toLocaleString()}`;
    }

    try {
        // Stage all changes first to get correct diff
        execSync('git add .');

        // Get status and diff
        const status = execSync('git status --short').toString();
        const diff = execSync('git diff --staged').toString().slice(0, 5000); // Limit to 5k chars

        if (!status) {
            console.log('No changes to commit.');
            process.exit(0);
        }

        console.log('🤖 Analyzing changes with AI...');

        const prompt = `You are a helpful coding assistant. Generate a concise but descriptive git commit message in English based on these changes. 
Follow conventional commits (feat:, fix:, style:, chore:, refactor:).
Keep the summary under 50 characters, followed by a bulleted list of specific changes if necessary.

GIT STATUS:
${status}

GIT DIFF:
${diff}`;

        const models = [
            'tngtech/deepseek-r1t2-chimera:free',
            'google/gemini-2.0-pro-exp-02-05:free',
            'google/gemini-2.0-flash-exp:free',
            'meta-llama/llama-3.3-70b-instruct:free'
        ];

        let response;
        let data;
        let lastError;

        for (const model of models) {
            try {
                console.log(`🤖 Attempting to use model: ${model}...`);
                response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'https://github.com/ryadovoys/portfolio',
                        'X-Title': 'Portfolio Save Script'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });

                data = await response.json();

                if (response.ok && data.choices && data.choices[0]) {
                    console.log(`✅ Success with ${model}`);
                    const message = data.choices[0].message.content.trim();
                    return message;
                } else {
                    lastError = data.error?.message || response.statusText || 'Unknown error';
                    console.warn(`⚠️  Model ${model} failed: ${lastError}`);
                }
            } catch (err) {
                lastError = err.message;
                console.warn(`⚠️  Connection to ${model} failed: ${lastError}`);
            }
        }

        throw new Error(`All free models failed. Last error: ${lastError}`);

    } catch (error) {
        console.error('❌ AI analysis failed:', error.message);
        return `feat: update project contents (AI generation failed)`;
    }
}

async function run() {
    try {
        console.log('🏗️  Starting build...');
        execSync('npm run build', { stdio: 'inherit' });

        const commitMessage = await generateCommitMessage();
        console.log(`\n📝 Commit message:\n---\n${commitMessage}\n---`);

        console.log('💾 Committing changes...');
        // Write message to temp file to handle multi-line messages safely
        const tempMsgFile = path.join(__dirname, '.commit_msg.tmp');
        fs.writeFileSync(tempMsgFile, commitMessage);

        execSync('git add .');
        execSync(`git commit -F "${tempMsgFile}"`);
        fs.unlinkSync(tempMsgFile);

        console.log('🚀 Pushing to origin...');
        execSync('git push origin main');

        console.log('\n✅ Successfully saved and pushed!');

    } catch (error) {
        console.error('\n❌ Error during save:', error.message);
        process.exit(1);
    }
}

run();
