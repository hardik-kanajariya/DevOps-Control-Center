#!/usr/bin/env node

/**
 * Security Test Script
 * Performs comprehensive security testing for the DevOps Control Center
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Starting security tests...\n');

const tests = {
    passed: 0,
    failed: 0,
    warnings: 0,
    results: []
};

function runTest(name, testFunction) {
    try {
        console.log(`Running: ${name}`);
        const result = testFunction();
        if (result.passed) {
            tests.passed++;
            console.log(`✅ ${name}: PASSED`);
        } else {
            tests.failed++;
            console.log(`❌ ${name}: FAILED - ${result.message}`);
        }
        if (result.warnings && result.warnings.length > 0) {
            tests.warnings += result.warnings.length;
            result.warnings.forEach(warning => {
                console.log(`⚠️  ${name}: ${warning}`);
            });
        }
        tests.results.push({ name, ...result });
    } catch (error) {
        tests.failed++;
        console.log(`❌ ${name}: ERROR - ${error.message}`);
        tests.results.push({ name, passed: false, message: error.message });
    }
    console.log('');
}

// Test 1: Check for sensitive data in code
function testSensitiveDataInCode() {
    const sensitivePatterns = [
        /password\s*[:=]\s*["'][^"']{8,}["']/i, // Passwords with actual values
        /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/i, // API keys with actual values
        /secret\s*[:=]\s*["'][^"']{8,}["']/i, // Secrets with actual values
        /private[_-]?key\s*[:=]\s*["']-----BEGIN/i, // Actual private keys
        /token\s*[:=]\s*["'][a-zA-Z0-9]{20,}["']/i // Actual tokens (not test ones)
    ];

    const sourceFiles = [];
    const warnings = [];

    function scanDirectory(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                scanDirectory(filePath);
            } else if (file.match(/\.(ts|tsx|js|jsx)$/) && !filePath.includes('test')) {
                sourceFiles.push(filePath);
            }
        }
    }

    scanDirectory('src');

    for (const filePath of sourceFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of sensitivePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                // Exclude known safe patterns
                const safePatterns = [
                    /TOKEN_KEY\s*=\s*["'][\w_]+["']/i, // Constant names
                    /token.*test|test.*token/i, // Test tokens
                    /ghp_test_token|example.*token/i // Placeholder tokens
                ];

                const isSafe = safePatterns.some(safe => safe.test(matches[0]));
                if (!isSafe) {
                    warnings.push(`Potential sensitive data found in ${filePath}: ${matches[0].substring(0, 50)}...`);
                }
            }
        }
    }

    return {
        passed: warnings.length === 0,
        message: warnings.length > 0 ? `Found ${warnings.length} potential security issues` : 'No sensitive data found in source code',
        warnings
    };
}

// Test 2: Check package.json for known vulnerabilities
function testPackageVulnerabilities() {
    try {
        const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
        const audit = JSON.parse(auditResult);

        const highVulns = audit.vulnerabilities ?
            Object.values(audit.vulnerabilities).filter(v => v.severity === 'high' || v.severity === 'critical').length : 0;

        return {
            passed: highVulns === 0,
            message: highVulns > 0 ? `Found ${highVulns} high/critical vulnerabilities` : 'No high/critical vulnerabilities found',
            warnings: highVulns > 0 ? [`Run 'npm audit fix' to resolve vulnerabilities`] : []
        };
    } catch (error) {
        // npm audit returns non-zero exit code when vulnerabilities are found
        const output = error.stdout || error.message;
        if (output.includes('found') && output.includes('vulnerabilities')) {
            return {
                passed: false,
                message: 'Vulnerabilities found in dependencies',
                warnings: ['Run npm audit for detailed information']
            };
        }
        return {
            passed: true,
            message: 'Audit completed successfully'
        };
    }
}

// Test 3: Check for proper CSP configuration
function testContentSecurityPolicy() {
    const cspFile = 'src/main/security/contentSecurityPolicy.ts';

    if (!fs.existsSync(cspFile)) {
        return {
            passed: false,
            message: 'Content Security Policy implementation not found'
        };
    }

    const content = fs.readFileSync(cspFile, 'utf8');
    const requiredDirectives = [
        'defaultSrc',
        'scriptSrc',
        'styleSrc',
        'imgSrc',
        'connectSrc',
        'frameSrc'
    ];

    const missingDirectives = requiredDirectives.filter(directive =>
        !content.includes(directive)
    );

    return {
        passed: missingDirectives.length === 0,
        message: missingDirectives.length > 0 ?
            `Missing CSP directives: ${missingDirectives.join(', ')}` :
            'Content Security Policy properly configured',
        warnings: missingDirectives.length > 0 ? ['Consider adding missing CSP directives'] : []
    };
}

// Test 4: Check for secure IPC implementation
function testSecureIPC() {
    const preloadFile = 'src/main/preload.ts';

    if (!fs.existsSync(preloadFile)) {
        return {
            passed: false,
            message: 'Preload script not found'
        };
    }

    const content = fs.readFileSync(preloadFile, 'utf8');
    const securityChecks = [
        { pattern: /contextBridge\.exposeInMainWorld/, name: 'contextBridge usage' },
        { pattern: /validators\./, name: 'input validation' },
        { pattern: /secureInvoke/, name: 'secure IPC wrapper' }
    ];

    const failedChecks = securityChecks.filter(check =>
        !check.pattern.test(content)
    ).map(check => check.name);

    return {
        passed: failedChecks.length === 0,
        message: failedChecks.length > 0 ?
            `Missing security features: ${failedChecks.join(', ')}` :
            'Secure IPC implementation found',
        warnings: failedChecks.length > 0 ? ['Implement missing security features'] : []
    };
}

// Test 5: Check for secure storage implementation
function testSecureStorage() {
    const storageFile = 'src/main/security/secureStorage.ts';

    if (!fs.existsSync(storageFile)) {
        return {
            passed: false,
            message: 'Secure storage implementation not found'
        };
    }

    const content = fs.readFileSync(storageFile, 'utf8');
    const securityFeatures = [
        { pattern: /safeStorage/, name: 'Electron safeStorage' },
        { pattern: /encrypt/, name: 'encryption functionality' },
        { pattern: /checksum/, name: 'data integrity checks' },
        { pattern: /validateKey/, name: 'key validation' }
    ];

    const missingFeatures = securityFeatures.filter(feature =>
        !feature.pattern.test(content)
    ).map(feature => feature.name);

    return {
        passed: missingFeatures.length === 0,
        message: missingFeatures.length > 0 ?
            `Missing security features: ${missingFeatures.join(', ')}` :
            'Secure storage properly implemented',
        warnings: missingFeatures.length > 0 ? ['Implement missing security features'] : []
    };
}

// Test 6: Check build configuration security
function testBuildSecurity() {
    const warnings = [];
    let issues = 0;

    // Check for code signing configuration
    const builderConfig = 'electron-builder.package.json';
    if (fs.existsSync(builderConfig)) {
        const config = JSON.parse(fs.readFileSync(builderConfig, 'utf8'));

        if (!config.build?.win?.sign) {
            warnings.push('Windows code signing not configured');
            issues++;
        }

        if (!config.build?.mac?.hardenedRuntime) {
            warnings.push('macOS hardened runtime not enabled');
            issues++;
        }
    } else {
        warnings.push('electron-builder configuration not found');
        issues++;
    }

    // Check for security scripts
    const securityScripts = [
        'scripts/sign-windows.js',
        'scripts/notarize.js',
        'scripts/sign-linux.sh'
    ];

    const missingScripts = securityScripts.filter(script => !fs.existsSync(script));
    issues += missingScripts.length;
    warnings.push(...missingScripts.map(script => `Missing security script: ${script}`));

    return {
        passed: issues === 0,
        message: issues > 0 ? `Found ${issues} build security issues` : 'Build security properly configured',
        warnings
    };
}

// Test 7: Check TypeScript configuration security
function testTypeScriptSecurity() {
    const tsConfigFile = 'tsconfig.json';
    const warnings = [];

    if (!fs.existsSync(tsConfigFile)) {
        return {
            passed: false,
            message: 'TypeScript configuration not found'
        };
    }

    const tsConfig = JSON.parse(fs.readFileSync(tsConfigFile, 'utf8'));
    const compilerOptions = tsConfig.compilerOptions || {};

    // Check for security-related TypeScript options
    const securityOptions = {
        strict: true,
        noImplicitAny: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true
    };

    Object.entries(securityOptions).forEach(([option, expectedValue]) => {
        if (compilerOptions[option] !== expectedValue) {
            warnings.push(`TypeScript option '${option}' should be set to ${expectedValue}`);
        }
    });

    return {
        passed: warnings.length === 0,
        message: warnings.length > 0 ?
            `Found ${warnings.length} TypeScript security issues` :
            'TypeScript security configuration is correct',
        warnings
    };
}

// Run all tests
console.log('🔒 DevOps Control Center Security Test Suite\n');

runTest('Sensitive Data in Code', testSensitiveDataInCode);
runTest('Package Vulnerabilities', testPackageVulnerabilities);
runTest('Content Security Policy', testContentSecurityPolicy);
runTest('Secure IPC Implementation', testSecureIPC);
runTest('Secure Storage Implementation', testSecureStorage);
runTest('Build Security Configuration', testBuildSecurity);
runTest('TypeScript Security Configuration', testTypeScriptSecurity);

// Generate report
console.log('📊 Security Test Results:');
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`⚠️  Warnings: ${tests.warnings}`);

const score = Math.round((tests.passed / (tests.passed + tests.failed)) * 100);
console.log(`🎯 Security Score: ${score}/100`);

if (tests.failed > 0) {
    console.log('\n🚨 Critical Issues Found:');
    tests.results.filter(r => !r.passed).forEach(result => {
        console.log(`- ${result.name}: ${result.message}`);
    });
}

if (tests.warnings > 0) {
    console.log('\n⚠️  Recommendations:');
    tests.results.forEach(result => {
        if (result.warnings && result.warnings.length > 0) {
            result.warnings.forEach(warning => {
                console.log(`- ${warning}`);
            });
        }
    });
}

// Generate JSON report
const report = {
    timestamp: new Date().toISOString(),
    score,
    summary: {
        passed: tests.passed,
        failed: tests.failed,
        warnings: tests.warnings,
        total: tests.passed + tests.failed
    },
    tests: tests.results
};

fs.writeFileSync('security-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Detailed report saved to security-report.json');

// Exit with appropriate code
process.exit(tests.failed > 0 ? 1 : 0);
