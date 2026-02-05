import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { SSHKeyPair, SSHKeyGenerationOptions, SSHKeyInfo } from '../../shared/types';

export class SSHKeyService {
    private static instance: SSHKeyService;
    private keysDirectory: string;

    private constructor() {
        this.keysDirectory = path.join(os.homedir(), '.ssh', 'devops-control-center');
    }

    public static getInstance(): SSHKeyService {
        if (!SSHKeyService.instance) {
            SSHKeyService.instance = new SSHKeyService();
        }
        return SSHKeyService.instance;
    }

    /**
     * Initialize the keys directory
     */
    public async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.keysDirectory, { recursive: true, mode: 0o700 });
            console.log('SSHKeyService initialized, keys directory:', this.keysDirectory);
        } catch (error) {
            console.error('Failed to initialize SSHKeyService:', error);
            throw error;
        }
    }

    /**
     * Generate a new SSH key pair
     */
    public async generateKeyPair(options: SSHKeyGenerationOptions): Promise<SSHKeyPair> {
        const { name, type = 'ed25519', passphrase = '', comment } = options;

        // Sanitize the key name
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const privateKeyPath = path.join(this.keysDirectory, safeName);
        const publicKeyPath = `${privateKeyPath}.pub`;

        // Check if key already exists
        try {
            await fs.access(privateKeyPath);
            throw new Error(`SSH key with name "${safeName}" already exists`);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        // Generate key using ssh-keygen
        await this.runSSHKeygen(privateKeyPath, type, passphrase, comment || `devops-control-center-${safeName}`);

        // Read the generated keys
        const privateKey = await fs.readFile(privateKeyPath, 'utf-8');
        const publicKey = await fs.readFile(publicKeyPath, 'utf-8');

        // Set proper permissions
        await fs.chmod(privateKeyPath, 0o600);
        await fs.chmod(publicKeyPath, 0o644);

        const keyPair: SSHKeyPair = {
            name: safeName,
            type,
            privateKeyPath,
            publicKeyPath,
            publicKey: publicKey.trim(),
            fingerprint: await this.getFingerprint(publicKeyPath),
            createdAt: new Date().toISOString(),
            hasPassphrase: passphrase.length > 0
        };

        return keyPair;
    }

    /**
     * Run ssh-keygen command
     */
    private runSSHKeygen(
        keyPath: string,
        type: 'ed25519' | 'rsa',
        passphrase: string,
        comment: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const args = [
                '-t', type,
                '-f', keyPath,
                '-C', comment,
                '-N', passphrase
            ];

            // For RSA, add bit size
            if (type === 'rsa') {
                args.push('-b', '4096');
            }

            const process = spawn('ssh-keygen', args);
            let stderr = '';

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ssh-keygen failed: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Failed to run ssh-keygen: ${error.message}. Make sure ssh-keygen is installed.`));
            });
        });
    }

    /**
     * Get the fingerprint of a public key
     */
    private async getFingerprint(publicKeyPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const process = spawn('ssh-keygen', ['-lf', publicKeyPath]);
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    // Parse fingerprint from output like "256 SHA256:xxx comment (ED25519)"
                    const match = stdout.match(/SHA256:[^\s]+/);
                    resolve(match ? match[0] : 'unknown');
                } else {
                    resolve('unknown');
                }
            });

            process.on('error', () => {
                resolve('unknown');
            });
        });
    }

    /**
     * List all generated SSH keys
     */
    public async listKeys(): Promise<SSHKeyInfo[]> {
        try {
            const files = await fs.readdir(this.keysDirectory);
            const keys: SSHKeyInfo[] = [];

            for (const file of files) {
                // Skip .pub files, we'll read them with their private key
                if (file.endsWith('.pub')) continue;

                const privateKeyPath = path.join(this.keysDirectory, file);
                const publicKeyPath = `${privateKeyPath}.pub`;

                try {
                    const [privateKeyStat, publicKey] = await Promise.all([
                        fs.stat(privateKeyPath),
                        fs.readFile(publicKeyPath, 'utf-8').catch(() => null)
                    ]);

                    if (publicKey) {
                        const keyType = this.detectKeyType(publicKey);
                        keys.push({
                            name: file,
                            type: keyType,
                            privateKeyPath,
                            publicKeyPath,
                            publicKey: publicKey.trim(),
                            fingerprint: await this.getFingerprint(publicKeyPath),
                            createdAt: privateKeyStat.birthtime.toISOString(),
                            hasPassphrase: false // Can't detect this without trying to use the key
                        });
                    }
                } catch (err) {
                    // Skip files that can't be read
                    console.warn(`Skipping key file ${file}:`, err);
                }
            }

            return keys;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Detect SSH key type from public key content
     */
    private detectKeyType(publicKey: string): 'ed25519' | 'rsa' {
        if (publicKey.includes('ssh-ed25519')) {
            return 'ed25519';
        } else if (publicKey.includes('ssh-rsa')) {
            return 'rsa';
        }
        return 'rsa'; // Default
    }

    /**
     * Get a specific key by name
     */
    public async getKey(name: string): Promise<SSHKeyInfo | null> {
        const keys = await this.listKeys();
        return keys.find(k => k.name === name) || null;
    }

    /**
     * Delete an SSH key pair
     */
    public async deleteKey(name: string): Promise<void> {
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const privateKeyPath = path.join(this.keysDirectory, safeName);
        const publicKeyPath = `${privateKeyPath}.pub`;

        await Promise.all([
            fs.unlink(privateKeyPath).catch(() => { }),
            fs.unlink(publicKeyPath).catch(() => { })
        ]);
    }

    /**
     * Import an existing SSH key
     */
    public async importKey(name: string, privateKeyPath: string): Promise<SSHKeyInfo> {
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const destPrivateKeyPath = path.join(this.keysDirectory, safeName);
        const destPublicKeyPath = `${destPrivateKeyPath}.pub`;

        // Read source key
        const privateKey = await fs.readFile(privateKeyPath, 'utf-8');

        // Try to read the public key (might be alongside the private key)
        let publicKey: string;
        try {
            publicKey = await fs.readFile(`${privateKeyPath}.pub`, 'utf-8');
        } catch {
            // Generate public key from private key
            publicKey = await this.extractPublicKey(privateKeyPath);
        }

        // Write keys to our directory
        await fs.writeFile(destPrivateKeyPath, privateKey, { mode: 0o600 });
        await fs.writeFile(destPublicKeyPath, publicKey, { mode: 0o644 });

        return {
            name: safeName,
            type: this.detectKeyType(publicKey),
            privateKeyPath: destPrivateKeyPath,
            publicKeyPath: destPublicKeyPath,
            publicKey: publicKey.trim(),
            fingerprint: await this.getFingerprint(destPublicKeyPath),
            createdAt: new Date().toISOString(),
            hasPassphrase: false
        };
    }

    /**
     * Extract public key from private key
     */
    private extractPublicKey(privateKeyPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const process = spawn('ssh-keygen', ['-y', '-f', privateKeyPath]);
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(`Failed to extract public key: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Failed to run ssh-keygen: ${error.message}`));
            });
        });
    }

    /**
     * Get the default SSH keys directory
     */
    public getKeysDirectory(): string {
        return this.keysDirectory;
    }

    /**
     * Read private key content
     */
    public async readPrivateKey(keyPath: string): Promise<string> {
        return fs.readFile(keyPath, 'utf-8');
    }
}

// Export singleton instance
export const sshKeyService = SSHKeyService.getInstance();
