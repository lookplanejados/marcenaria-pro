/** @type {import('next').NextConfig} */
const { execSync } = require('child_process');

let buildNumber = '0';
try {
    buildNumber = execSync('git rev-list --count HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {}

const nextConfig = {
    transpilePackages: ['lucide-react'],
    env: {
        NEXT_PUBLIC_APP_VERSION: `1.0.${buildNumber}`,
    },
}

module.exports = nextConfig
