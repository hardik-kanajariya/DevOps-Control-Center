#!/usr/bin/env node

/**
 * Launch Preparation Script
 * Comprehensive preparation for production launch of DevOps Control Center
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 DevOps Control Center - Launch Preparation\n');

class LaunchPreparation {
    constructor() {
        this.checklist = [];
        this.errors = [];
        this.warnings = [];
        this.version = this.getVersion();
    }

    getVersion() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            return packageJson.version;
        } catch (error) {
            return '1.0.0';
        }
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const symbols = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
        console.log(`${symbols[level] || 'ℹ️'} [${timestamp}] ${message}`);
    }

    addChecklistItem(name, status, details = '') {
        this.checklist.push({ name, status, details });
        this.log(status, `${name}${details ? ': ' + details : ''}`);
    }

    // Step 1: Environment Validation
    async validateEnvironment() {
        this.log('info', 'Step 1: Validating environment...');

        // Check Node.js version
        try {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
            if (majorVersion >= 16) {
                this.addChecklistItem('Node.js Version', 'success', `${nodeVersion} (>= 16.0.0)`);
            } else {
                this.addChecklistItem('Node.js Version', 'error', `${nodeVersion} (requires >= 16.0.0)`);
                this.errors.push('Node.js version 16.0.0 or higher is required');
            }
        } catch (error) {
            this.addChecklistItem('Node.js Version', 'error', 'Unable to determine version');
            this.errors.push('Could not verify Node.js version');
        }

        // Check npm version
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            const majorVersion = parseInt(npmVersion.split('.')[0]);
            if (majorVersion >= 8) {
                this.addChecklistItem('npm Version', 'success', `${npmVersion} (>= 8.0.0)`);
            } else {
                this.addChecklistItem('npm Version', 'warning', `${npmVersion} (recommended >= 8.0.0)`);
                this.warnings.push('npm version 8.0.0 or higher is recommended');
            }
        } catch (error) {
            this.addChecklistItem('npm Version', 'warning', 'Unable to determine version');
            this.warnings.push('Could not verify npm version');
        }

        // Check Git status
        try {
            const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
            if (gitStatus === '') {
                this.addChecklistItem('Git Status', 'success', 'Working directory clean');
            } else {
                this.addChecklistItem('Git Status', 'warning', 'Uncommitted changes detected');
                this.warnings.push('There are uncommitted changes in the working directory');
            }
        } catch (error) {
            this.addChecklistItem('Git Status', 'warning', 'Not a git repository or git not available');
        }
    }

    // Step 2: Security Audit
    async runSecurityAudit() {
        this.log('info', 'Step 2: Running security audit...');

        try {
            // Run our custom security test
            execSync('node scripts/security-test.js', { stdio: 'pipe' });
            this.addChecklistItem('Security Tests', 'success', 'All security tests passed');
        } catch (error) {
            this.addChecklistItem('Security Tests', 'error', 'Security tests failed');
            this.errors.push('Security audit failed - review security-report.json');
        }

        // Check for security audit service
        const auditServicePath = 'src/main/security/auditService.ts';
        if (fs.existsSync(auditServicePath)) {
            this.addChecklistItem('Security Audit Service', 'success', 'Implementation found');
        } else {
            this.addChecklistItem('Security Audit Service', 'error', 'Implementation missing');
            this.errors.push('Security audit service implementation not found');
        }

        // Check for secure storage
        const secureStoragePath = 'src/main/security/secureStorage.ts';
        if (fs.existsSync(secureStoragePath)) {
            this.addChecklistItem('Secure Storage', 'success', 'Implementation found');
        } else {
            this.addChecklistItem('Secure Storage', 'error', 'Implementation missing');
            this.errors.push('Secure storage implementation not found');
        }

        // Check for CSP implementation
        const cspPath = 'src/main/security/contentSecurityPolicy.ts';
        if (fs.existsSync(cspPath)) {
            this.addChecklistItem('Content Security Policy', 'success', 'Implementation found');
        } else {
            this.addChecklistItem('Content Security Policy', 'error', 'Implementation missing');
            this.errors.push('Content Security Policy implementation not found');
        }
    }

    // Step 3: Code Signing Validation
    async validateCodeSigning() {
        this.log('info', 'Step 3: Validating code signing setup...');

        // Check signing service
        const signingServicePath = 'src/main/security/codeSigningService.ts';
        if (fs.existsSync(signingServicePath)) {
            this.addChecklistItem('Code Signing Service', 'success', 'Implementation found');
        } else {
            this.addChecklistItem('Code Signing Service', 'error', 'Implementation missing');
            this.errors.push('Code signing service implementation not found');
        }

        // Check signing scripts
        const signingScripts = [
            'scripts/sign-windows.js',
            'scripts/notarize.js',
            'scripts/sign-linux.sh'
        ];

        for (const script of signingScripts) {
            if (fs.existsSync(script)) {
                this.addChecklistItem(`Signing Script (${path.basename(script)})`, 'success', 'Script found');
            } else {
                this.addChecklistItem(`Signing Script (${path.basename(script)})`, 'warning', 'Script missing');
                this.warnings.push(`Signing script ${script} not found`);
            }
        }

        // Check entitlements
        const entitlements = [
            'build/entitlements.mac.plist',
            'build/entitlements.mac.inherit.plist'
        ];

        for (const entitlement of entitlements) {
            if (fs.existsSync(entitlement)) {
                this.addChecklistItem(`Entitlements (${path.basename(entitlement)})`, 'success', 'File found');
            } else {
                this.addChecklistItem(`Entitlements (${path.basename(entitlement)})`, 'warning', 'File missing');
                this.warnings.push(`Entitlements file ${entitlement} not found`);
            }
        }

        // Check environment variables for signing
        const signingEnvVars = [
            'CSC_LINK',
            'CSC_KEY_PASSWORD',
            'WIN_CSC_LINK',
            'WIN_CSC_KEY_PASSWORD',
            'APPLE_ID',
            'APPLE_ID_PASSWORD',
            'APPLE_TEAM_ID'
        ];

        for (const envVar of signingEnvVars) {
            if (process.env[envVar]) {
                this.addChecklistItem(`Environment Variable (${envVar})`, 'success', 'Configured');
            } else {
                this.addChecklistItem(`Environment Variable (${envVar})`, 'warning', 'Not configured');
                this.warnings.push(`Environment variable ${envVar} not set`);
            }
        }
    }

    // Step 4: Build Configuration
    async validateBuildConfiguration() {
        this.log('info', 'Step 4: Validating build configuration...');

        // Check electron-builder configuration
        const builderConfigPath = 'electron-builder.package.json';
        if (fs.existsSync(builderConfigPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(builderConfigPath, 'utf8'));
                this.addChecklistItem('Electron Builder Config', 'success', 'Configuration found');

                // Validate build targets
                const platforms = ['win', 'mac', 'linux'];
                for (const platform of platforms) {
                    if (config.build && config.build[platform]) {
                        this.addChecklistItem(`${platform.toUpperCase()} Build Target`, 'success', 'Configured');
                    } else {
                        this.addChecklistItem(`${platform.toUpperCase()} Build Target`, 'warning', 'Not configured');
                        this.warnings.push(`${platform.toUpperCase()} build target not configured`);
                    }
                }
            } catch (error) {
                this.addChecklistItem('Electron Builder Config', 'error', 'Invalid JSON');
                this.errors.push('electron-builder configuration is invalid');
            }
        } else {
            this.addChecklistItem('Electron Builder Config', 'error', 'Configuration missing');
            this.errors.push('electron-builder configuration not found');
        }

        // Check package.json scripts
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const requiredScripts = ['build', 'dist', 'test', 'security:audit'];

            for (const script of requiredScripts) {
                if (packageJson.scripts && packageJson.scripts[script]) {
                    this.addChecklistItem(`Script (${script})`, 'success', 'Defined');
                } else {
                    this.addChecklistItem(`Script (${script})`, 'warning', 'Not defined');
                    this.warnings.push(`npm script '${script}' not defined`);
                }
            }
        } catch (error) {
            this.addChecklistItem('Package.json Scripts', 'error', 'Unable to read package.json');
            this.errors.push('Could not validate package.json scripts');
        }
    }

    // Step 5: CI/CD Pipeline
    async validateCICD() {
        this.log('info', 'Step 5: Validating CI/CD pipeline...');

        // Check GitHub Actions workflow
        const workflowPath = '.github/workflows/build-and-release.yml';
        if (fs.existsSync(workflowPath)) {
            this.addChecklistItem('GitHub Actions Workflow', 'success', 'Workflow found');

            // Validate workflow content
            try {
                const workflow = fs.readFileSync(workflowPath, 'utf8');
                const requiredJobs = ['security-audit', 'build-windows', 'build-macos', 'build-linux', 'release'];

                for (const job of requiredJobs) {
                    if (workflow.includes(job)) {
                        this.addChecklistItem(`CI Job (${job})`, 'success', 'Configured');
                    } else {
                        this.addChecklistItem(`CI Job (${job})`, 'warning', 'Not found');
                        this.warnings.push(`CI job '${job}' not found in workflow`);
                    }
                }
            } catch (error) {
                this.addChecklistItem('Workflow Validation', 'error', 'Unable to validate workflow');
                this.errors.push('Could not validate GitHub Actions workflow');
            }
        } else {
            this.addChecklistItem('GitHub Actions Workflow', 'error', 'Workflow missing');
            this.errors.push('GitHub Actions workflow not found');
        }

        // Check for secrets documentation
        const secretsDoc = 'docs/DEPLOYMENT.md';
        if (fs.existsSync(secretsDoc)) {
            this.addChecklistItem('Deployment Documentation', 'success', 'Documentation found');
        } else {
            this.addChecklistItem('Deployment Documentation', 'warning', 'Documentation missing');
            this.warnings.push('Deployment documentation not found');
        }
    }

    // Step 6: Testing
    async runTests() {
        this.log('info', 'Step 6: Running tests...');

        try {
            // Run unit tests
            execSync('npm test', { stdio: 'pipe' });
            this.addChecklistItem('Unit Tests', 'success', 'All tests passed');
        } catch (error) {
            this.addChecklistItem('Unit Tests', 'error', 'Some tests failed');
            this.errors.push('Unit tests failed - review test output');
        }

        try {
            // Run test coverage
            execSync('npm run test:coverage', { stdio: 'pipe' });
            this.addChecklistItem('Test Coverage', 'success', 'Coverage report generated');
        } catch (error) {
            this.addChecklistItem('Test Coverage', 'warning', 'Coverage report failed');
            this.warnings.push('Could not generate test coverage report');
        }
    }

    // Step 7: Documentation
    async validateDocumentation() {
        this.log('info', 'Step 7: Validating documentation...');

        const requiredDocs = [
            { file: 'README.md', name: 'README' },
            { file: 'CHANGELOG.md', name: 'Changelog' },
            { file: 'LICENSE', name: 'License' },
            { file: 'docs/USER_GUIDE.md', name: 'User Guide' },
            { file: 'docs/DEVELOPER_GUIDE.md', name: 'Developer Guide' }
        ];

        for (const doc of requiredDocs) {
            if (fs.existsSync(doc.file)) {
                this.addChecklistItem(`Documentation (${doc.name})`, 'success', 'File exists');
            } else {
                this.addChecklistItem(`Documentation (${doc.name})`, 'warning', 'File missing');
                this.warnings.push(`${doc.name} documentation not found`);
            }
        }
    }

    // Step 8: Assets and Resources
    async validateAssets() {
        this.log('info', 'Step 8: Validating assets and resources...');

        const requiredAssets = [
            { file: 'build/icon.ico', name: 'Windows Icon' },
            { file: 'build/icon.icns', name: 'macOS Icon' },
            { file: 'build/icon.png', name: 'Linux Icon' },
            { file: 'assets/', name: 'Assets Directory', type: 'directory' }
        ];

        for (const asset of requiredAssets) {
            const exists = asset.type === 'directory'
                ? fs.existsSync(asset.file) && fs.statSync(asset.file).isDirectory()
                : fs.existsSync(asset.file);

            if (exists) {
                this.addChecklistItem(`Asset (${asset.name})`, 'success', 'Found');
            } else {
                this.addChecklistItem(`Asset (${asset.name})`, 'warning', 'Missing');
                this.warnings.push(`${asset.name} not found at ${asset.file}`);
            }
        }
    }

    // Generate launch report
    generateLaunchReport() {
        const report = {
            timestamp: new Date().toISOString(),
            version: this.version,
            readiness: {
                score: this.calculateReadinessScore(),
                status: this.getLaunchStatus(),
                errors: this.errors.length,
                warnings: this.warnings.length
            },
            checklist: this.checklist,
            errors: this.errors,
            warnings: this.warnings,
            recommendations: this.generateRecommendations()
        };

        fs.writeFileSync('launch-report.json', JSON.stringify(report, null, 2));
        return report;
    }

    calculateReadinessScore() {
        const total = this.checklist.length;
        const passed = this.checklist.filter(item => item.status === 'success').length;
        return Math.round((passed / total) * 100);
    }

    getLaunchStatus() {
        if (this.errors.length > 0) return 'NOT_READY';
        if (this.warnings.length > 5) return 'READY_WITH_WARNINGS';
        return 'READY';
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.errors.length > 0) {
            recommendations.push('🚨 Critical: Resolve all errors before production launch');
            recommendations.push('🔍 Review error details and implement necessary fixes');
        }

        if (this.warnings.length > 0) {
            recommendations.push('⚠️ Address warnings to improve production readiness');
            recommendations.push('📚 Update missing documentation for better user experience');
        }

        if (this.warnings.filter(w => w.includes('Environment variable')).length > 0) {
            recommendations.push('🔐 Configure all signing environment variables for automated builds');
        }

        if (!fs.existsSync('docs/DEPLOYMENT.md')) {
            recommendations.push('📖 Create deployment documentation with setup instructions');
        }

        recommendations.push('🧪 Run a full build test on all target platforms');
        recommendations.push('🔄 Test the auto-updater functionality with a beta release');
        recommendations.push('📊 Monitor application performance and security after launch');

        return recommendations;
    }

    // Main execution
    async run() {
        console.log(`🏁 Preparing DevOps Control Center v${this.version} for launch\n`);

        try {
            await this.validateEnvironment();
            await this.runSecurityAudit();
            await this.validateCodeSigning();
            await this.validateBuildConfiguration();
            await this.validateCICD();
            await this.runTests();
            await this.validateDocumentation();
            await this.validateAssets();

            console.log('\n📊 Launch Preparation Summary:');
            const report = this.generateLaunchReport();

            console.log(`\n🎯 Readiness Score: ${report.readiness.score}/100`);
            console.log(`📊 Status: ${report.readiness.status}`);
            console.log(`✅ Passed: ${this.checklist.filter(item => item.status === 'success').length}`);
            console.log(`⚠️  Warnings: ${report.readiness.warnings}`);
            console.log(`❌ Errors: ${report.readiness.errors}`);

            if (report.readiness.status === 'READY') {
                console.log('\n🚀 DevOps Control Center is ready for production launch!');
            } else if (report.readiness.status === 'READY_WITH_WARNINGS') {
                console.log('\n⚠️ DevOps Control Center can be launched but has warnings to address.');
            } else {
                console.log('\n🚨 DevOps Control Center is NOT ready for production launch.');
                console.log('Please resolve all errors before proceeding.');
            }

            if (report.recommendations.length > 0) {
                console.log('\n💡 Recommendations:');
                report.recommendations.forEach(rec => console.log(`  ${rec}`));
            }

            console.log('\n📄 Detailed launch report saved to launch-report.json');

            return report.readiness.status === 'NOT_READY' ? 1 : 0;

        } catch (error) {
            console.error('\n❌ Launch preparation failed:', error.message);
            return 1;
        }
    }
}

// Execute launch preparation
const preparation = new LaunchPreparation();
preparation.run().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    console.error('❌ Fatal error during launch preparation:', error);
    process.exit(1);
});
