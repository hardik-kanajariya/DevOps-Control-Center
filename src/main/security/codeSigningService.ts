/**
 * Code Signing Configuration
 * Handles code signing setup for Windows, macOS, and Linux distributions
 */

import { join } from 'path';
import { existsSync } from 'fs';

export interface CodeSigningConfig {
    windows?: WindowsSigningConfig;
    macOS?: MacOSSigningConfig;
    linux?: LinuxSigningConfig;
}

export interface WindowsSigningConfig {
    certificateFile?: string;
    certificatePassword?: string;
    certificateSubjectName?: string;
    certificateSha1?: string;
    timestampUrl?: string;
    additionalOptions?: string[];
}

export interface MacOSSigningConfig {
    identity?: string;
    provisioningProfile?: string;
    entitlements?: string;
    entitlementsInherit?: string;
    hardenedRuntime?: boolean;
    gatekeeperAssess?: boolean;
    notarize?: {
        appleId?: string;
        appleIdPassword?: string;
        teamId?: string;
    };
}

export interface LinuxSigningConfig {
    gpgKey?: string;
    gpgPassphrase?: string;
    sign?: boolean;
}

/**
 * Code Signing Service for production-ready applications
 */
export class CodeSigningService {
    private config: CodeSigningConfig = {};

    constructor() {
        this.loadConfiguration();
    }

    /**
     * Load signing configuration from environment variables and files
     */
    private loadConfiguration(): void {
        this.config = {
            windows: {
                certificateFile: process.env.WIN_CSC_LINK,
                certificatePassword: process.env.WIN_CSC_KEY_PASSWORD,
                certificateSubjectName: process.env.WIN_CSC_NAME,
                certificateSha1: process.env.WIN_CSC_FINGERPRINT,
                timestampUrl: process.env.WIN_TIMESTAMP_URL || 'http://timestamp.comodoca.com',
                additionalOptions: []
            },
            macOS: {
                identity: process.env.CSC_NAME || process.env.APPLE_IDENTITY,
                provisioningProfile: process.env.PROVISIONING_PROFILE,
                entitlements: process.env.ENTITLEMENTS || 'build/entitlements.mac.plist',
                entitlementsInherit: process.env.ENTITLEMENTS_INHERIT || 'build/entitlements.mac.inherit.plist',
                hardenedRuntime: process.env.HARDENED_RUNTIME !== 'false',
                gatekeeperAssess: process.env.GATEKEEPER_ASSESS !== 'false',
                notarize: {
                    appleId: process.env.APPLE_ID,
                    appleIdPassword: process.env.APPLE_ID_PASSWORD,
                    teamId: process.env.APPLE_TEAM_ID
                }
            },
            linux: {
                gpgKey: process.env.GPG_KEY,
                gpgPassphrase: process.env.GPG_PASSPHRASE,
                sign: process.env.LINUX_SIGN !== 'false'
            }
        };
    }

    /**
     * Generate electron-builder configuration for code signing
     */
    generateBuilderConfig(): any {
        const config: any = {
            appId: 'com.devopscontrol.center',
            productName: 'DevOps Control Center',
            directories: {
                output: 'dist',
                buildResources: 'build'
            },
            files: [
                'dist-electron/',
                'dist/',
                '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
                '!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
                '!**/node_modules/*.d.ts',
                '!**/node_modules/.bin',
                '!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
                '!.editorconfig',
                '!**/._*',
                '!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}',
                '!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}',
                '!**/{appveyor.yml,.travis.yml,circle.yml}',
                '!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}'
            ],
            extraResources: [
                {
                    from: 'assets/',
                    to: 'assets/',
                    filter: ['**/*']
                }
            ],
            publish: {
                provider: 'github',
                owner: 'devops-control-center',
                repo: 'devops-control-center'
            }
        };

        // Windows configuration
        if (this.config.windows) {
            config.win = {
                target: [
                    {
                        target: 'nsis',
                        arch: ['x64', 'ia32']
                    },
                    {
                        target: 'portable',
                        arch: ['x64', 'ia32']
                    }
                ],
                icon: 'build/icon.ico',
                requestedExecutionLevel: 'asInvoker',
                signingHashAlgorithms: ['sha256'],
                sign: this.getWindowsSigningPath(),
                certificateFile: this.config.windows.certificateFile,
                certificatePassword: this.config.windows.certificatePassword,
                certificateSubjectName: this.config.windows.certificateSubjectName,
                certificateSha1: this.config.windows.certificateSha1,
                timestampUrl: this.config.windows.timestampUrl,
                additionalCertificateFile: process.env.WIN_CSC_ADDITIONAL_CERT
            };

            config.nsis = {
                oneClick: false,
                perMachine: false,
                allowElevation: true,
                allowToChangeInstallationDirectory: true,
                installerIcon: 'build/icon.ico',
                uninstallerIcon: 'build/icon.ico',
                installerHeaderIcon: 'build/icon.ico',
                createDesktopShortcut: true,
                createStartMenuShortcut: true,
                shortcutName: 'DevOps Control Center'
            };
        }

        // macOS configuration
        if (this.config.macOS) {
            config.mac = {
                target: [
                    {
                        target: 'dmg',
                        arch: ['x64', 'arm64']
                    },
                    {
                        target: 'zip',
                        arch: ['x64', 'arm64']
                    }
                ],
                icon: 'build/icon.icns',
                category: 'public.app-category.developer-tools',
                darkModeSupport: true,
                identity: this.config.macOS.identity,
                provisioningProfile: this.config.macOS.provisioningProfile,
                entitlements: this.config.macOS.entitlements,
                entitlementsInherit: this.config.macOS.entitlementsInherit,
                hardenedRuntime: this.config.macOS.hardenedRuntime,
                gatekeeperAssess: this.config.macOS.gatekeeperAssess,
                notarize: this.shouldNotarize() ? {
                    teamId: this.config.macOS.notarize?.teamId
                } : false
            };

            config.dmg = {
                sign: false,
                contents: [
                    {
                        x: 410,
                        y: 150,
                        type: 'link',
                        path: '/Applications'
                    },
                    {
                        x: 130,
                        y: 150,
                        type: 'file'
                    }
                ]
            };

            // Notarization configuration
            if (this.shouldNotarize()) {
                config.afterSign = 'scripts/notarize.js';
            }
        }

        // Linux configuration
        if (this.config.linux) {
            config.linux = {
                target: [
                    {
                        target: 'AppImage',
                        arch: ['x64']
                    },
                    {
                        target: 'deb',
                        arch: ['x64']
                    },
                    {
                        target: 'rpm',
                        arch: ['x64']
                    },
                    {
                        target: 'tar.gz',
                        arch: ['x64']
                    }
                ],
                icon: 'build/icon.png',
                category: 'Development',
                maintainer: 'DevOps Control Center Team',
                vendor: 'DevOps Control Center',
                synopsis: 'Unified DevOps management platform',
                description: 'A comprehensive DevOps control center for managing multiple providers and deployments'
            };

            config.deb = {
                depends: ['gconf2', 'gconf-service', 'libnotify4', 'libappindicator1', 'libxtst6', 'libnss3'],
                priority: 'optional'
            };

            config.rpm = {
                depends: ['libnotify', 'libappindicator', 'libxtst', 'nss']
            };

            // GPG signing for Linux
            if (this.config.linux.sign && this.config.linux.gpgKey) {
                config.linux.sign = this.config.linux.gpgKey;
            }
        }

        return config;
    }

    /**
     * Get Windows signing script path
     */
    private getWindowsSigningPath(): string | undefined {
        const signtoolPath = join(__dirname, '../../../scripts/sign-windows.js');
        return existsSync(signtoolPath) ? signtoolPath : undefined;
    }

    /**
     * Check if macOS notarization should be enabled
     */
    private shouldNotarize(): boolean {
        return !!(
            this.config.macOS?.notarize?.appleId &&
            this.config.macOS?.notarize?.appleIdPassword &&
            this.config.macOS?.notarize?.teamId
        );
    }

    /**
     * Validate signing configuration
     */
    validateConfiguration(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate Windows configuration
        if (process.platform === 'win32' || process.env.BUILD_WINDOWS) {
            if (!this.config.windows?.certificateFile && !this.config.windows?.certificateSubjectName) {
                errors.push('Windows code signing requires either certificateFile or certificateSubjectName');
            }
            if (this.config.windows?.certificateFile && !this.config.windows?.certificatePassword) {
                warnings.push('Windows certificate file provided but no password specified');
            }
        }

        // Validate macOS configuration
        if (process.platform === 'darwin' || process.env.BUILD_MACOS) {
            if (!this.config.macOS?.identity) {
                errors.push('macOS code signing requires identity');
            }
            if (this.shouldNotarize()) {
                if (!existsSync(this.config.macOS?.entitlements || '')) {
                    warnings.push('Entitlements file not found, notarization may fail');
                }
            }
        }

        // Validate Linux configuration
        if (process.platform === 'linux' || process.env.BUILD_LINUX) {
            if (this.config.linux?.sign && !this.config.linux?.gpgKey) {
                warnings.push('Linux signing enabled but no GPG key specified');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Generate signing scripts
     */
    generateSigningScripts(): void {
        this.generateWindowsSigningScript();
        this.generateMacOSNotarizeScript();
        this.generateLinuxSigningScript();
    }

    /**
     * Generate Windows signing script
     */
    private generateWindowsSigningScript(): void {
        const script = `
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(configuration) {
  const { path: filePath } = configuration;
  const certificateFile = process.env.WIN_CSC_LINK;
  const certificatePassword = process.env.WIN_CSC_KEY_PASSWORD;
  const timestampUrl = process.env.WIN_TIMESTAMP_URL || 'http://timestamp.comodoca.com';

  if (!certificateFile) {
    console.log('No certificate file specified, skipping Windows signing');
    return;
  }

  const signtoolPath = 'signtool.exe';
  const command = [
    signtoolPath,
    'sign',
    '/f', certificateFile,
    '/p', certificatePassword,
    '/tr', timestampUrl,
    '/td', 'sha256',
    '/fd', 'sha256',
    '/v',
    path.resolve(filePath)
  ].join(' ');

  try {
    console.log('Signing Windows executable...');
    execSync(command, { stdio: 'inherit' });
    console.log('Windows executable signed successfully');
  } catch (error) {
    console.error('Failed to sign Windows executable:', error);
    throw error;
  }
};
`;

        const fs = require('fs');
        const scriptsDir = join(process.cwd(), 'scripts');
        if (!existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }
        fs.writeFileSync(join(scriptsDir, 'sign-windows.js'), script);
    }

    /**
     * Generate macOS notarization script
     */
    private generateMacOSNotarizeScript(): void {
        const script = `
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = \`\${appOutDir}/\${appName}.app\`;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping notarization: Apple ID credentials not provided');
    return;
  }

  console.log('Notarizing macOS application...');
  
  try {
    await notarize({
      appBundleId: 'com.devopscontrol.center',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId
    });
    console.log('macOS application notarized successfully');
  } catch (error) {
    console.error('Failed to notarize macOS application:', error);
    throw error;
  }
};
`;

        const fs = require('fs');
        const scriptsDir = join(process.cwd(), 'scripts');
        if (!existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }
        fs.writeFileSync(join(scriptsDir, 'notarize.js'), script);
    }

    /**
     * Generate Linux signing script
     */
    private generateLinuxSigningScript(): void {
        const script = `
#!/bin/bash

# Linux package signing script
GPG_KEY="\${GPG_KEY}"
GPG_PASSPHRASE="\${GPG_PASSPHRASE}"

if [ -z "\$GPG_KEY" ]; then
  echo "No GPG key specified, skipping Linux signing"
  exit 0
fi

echo "Setting up GPG for package signing..."

# Import GPG key if provided
if [ -n "\$GPG_KEY" ]; then
  echo "\$GPG_KEY" | base64 -d | gpg --import --batch --yes
fi

# Sign all .deb and .rpm packages
for package in dist/*.{deb,rpm}; do
  if [ -f "\$package" ]; then
    echo "Signing \$package..."
    if [[ "\$package" == *.deb ]]; then
      dpkg-sig --sign builder "\$package"
    elif [[ "\$package" == *.rpm ]]; then
      rpm --addsign "\$package"
    fi
  fi
done

echo "Linux packages signed successfully"
`;

        const fs = require('fs');
        const scriptsDir = join(process.cwd(), 'scripts');
        if (!existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }
        fs.writeFileSync(join(scriptsDir, 'sign-linux.sh'), script);

        // Make script executable
        try {
            fs.chmodSync(join(scriptsDir, 'sign-linux.sh'), '755');
        } catch (error) {
            console.warn('Could not make Linux signing script executable:', error);
        }
    }

    /**
     * Get current configuration
     */
    getConfiguration(): CodeSigningConfig {
        return this.config;
    }

    /**
     * Update configuration
     */
    updateConfiguration(newConfig: Partial<CodeSigningConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}

/**
 * Global code signing service instance
 */
export const codeSigningService = new CodeSigningService();
