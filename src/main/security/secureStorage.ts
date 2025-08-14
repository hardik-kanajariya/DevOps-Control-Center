/**
 * Secure Storage Service
 * Handles encryption and secure storage of sensitive data
 */

import { safeStorage, app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import * as crypto from 'crypto';

export interface StorageOptions {
    encrypt?: boolean;
    compress?: boolean;
    backup?: boolean;
}

export interface StorageMetadata {
    encrypted: boolean;
    compressed: boolean;
    timestamp: number;
    version: string;
    checksum: string;
}

/**
 * Secure Storage Service for sensitive data
 */
export class SecureStorageService {
    private readonly storageDir: string;
    private readonly backupDir: string;
    private readonly isEncryptionAvailable: boolean;

    constructor() {
        this.storageDir = join(app.getPath('userData'), 'secure-storage');
        this.backupDir = join(this.storageDir, 'backups');
        this.isEncryptionAvailable = safeStorage.isEncryptionAvailable();

        this.initializeStorage();
    }

    /**
     * Initialize storage directories
     */
    private initializeStorage(): void {
        if (!existsSync(this.storageDir)) {
            mkdirSync(this.storageDir, { recursive: true });
        }
        if (!existsSync(this.backupDir)) {
            mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Store data securely
     */
    async store(key: string, data: any, options: StorageOptions = {}): Promise<void> {
        try {
            const {
                encrypt = true,
                compress = false,
                backup = true
            } = options;

            // Validate key
            this.validateKey(key);

            // Serialize data
            let serializedData = JSON.stringify(data);

            // Compress if requested
            if (compress) {
                serializedData = this.compress(serializedData);
            }

            // Create metadata
            const metadata: StorageMetadata = {
                encrypted: encrypt && this.isEncryptionAvailable,
                compressed: compress,
                timestamp: Date.now(),
                version: app.getVersion(),
                checksum: this.calculateChecksum(serializedData)
            };

            // Encrypt if requested and available
            let finalData: Buffer | string = serializedData;
            if (encrypt && this.isEncryptionAvailable) {
                finalData = safeStorage.encryptString(serializedData);
            }

            // Create storage object
            const storageObject = {
                metadata,
                data: encrypt && this.isEncryptionAvailable ? finalData.toString('base64') : finalData
            };

            // Save to file
            const filePath = this.getFilePath(key);
            if (backup && existsSync(filePath)) {
                this.createBackup(key);
            }

            writeFileSync(filePath, JSON.stringify(storageObject), 'utf8');
            console.log(`✅ Stored data for key: ${key}`);
        } catch (error) {
            console.error(`❌ Failed to store data for key ${key}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Storage operation failed: ${errorMessage}`);
        }
    }

    /**
     * Retrieve data securely
     */
    async retrieve(key: string): Promise<any> {
        try {
            // Validate key
            this.validateKey(key);

            const filePath = this.getFilePath(key);
            if (!existsSync(filePath)) {
                return null;
            }

            // Read storage object
            const fileContent = readFileSync(filePath, 'utf8');
            const storageObject = JSON.parse(fileContent);
            const { metadata, data } = storageObject;

            // Decrypt if encrypted
            let serializedData: string;
            if (metadata.encrypted) {
                if (!this.isEncryptionAvailable) {
                    throw new Error('Encryption not available on this system');
                }
                const encryptedBuffer = Buffer.from(data, 'base64');
                serializedData = safeStorage.decryptString(encryptedBuffer);
            } else {
                serializedData = data;
            }

            // Verify checksum
            const calculatedChecksum = this.calculateChecksum(serializedData);
            if (calculatedChecksum !== metadata.checksum) {
                throw new Error('Data integrity check failed');
            }

            // Decompress if compressed
            if (metadata.compressed) {
                serializedData = this.decompress(serializedData);
            }

            // Parse and return
            const result = JSON.parse(serializedData);
            console.log(`✅ Retrieved data for key: ${key}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to retrieve data for key ${key}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Retrieval operation failed: ${errorMessage}`);
        }
    }

    /**
     * Delete stored data
     */
    async delete(key: string): Promise<void> {
        try {
            this.validateKey(key);

            const filePath = this.getFilePath(key);
            if (existsSync(filePath)) {
                // Create backup before deletion
                this.createBackup(key);
                unlinkSync(filePath);
                console.log(`✅ Deleted data for key: ${key}`);
            }
        } catch (error) {
            console.error(`❌ Failed to delete data for key ${key}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Deletion operation failed: ${errorMessage}`);
        }
    }

    /**
     * Check if key exists
     */
    exists(key: string): boolean {
        try {
            this.validateKey(key);
            return existsSync(this.getFilePath(key));
        } catch (error) {
            return false;
        }
    }

    /**
     * List all stored keys
     */
    listKeys(): string[] {
        try {
            if (!existsSync(this.storageDir)) {
                return [];
            }

            const files = require('fs').readdirSync(this.storageDir);
            return files
                .filter((file: string) => file.endsWith('.json'))
                .map((file: string) => file.replace('.json', ''));
        } catch (error) {
            console.error('Failed to list keys:', error);
            return [];
        }
    }

    /**
     * Clear all stored data
     */
    async clear(): Promise<void> {
        try {
            const keys = this.listKeys();
            for (const key of keys) {
                await this.delete(key);
            }
            console.log('✅ Cleared all stored data');
        } catch (error) {
            console.error('❌ Failed to clear storage:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Clear operation failed: ${errorMessage}`);
        }
    }

    /**
     * Get storage statistics
     */
    getStats(): {
        totalKeys: number;
        totalSize: number;
        encryptionAvailable: boolean;
        lastModified: Date | null;
    } {
        const keys = this.listKeys();
        let totalSize = 0;
        let lastModified: Date | null = null;

        for (const key of keys) {
            try {
                const filePath = this.getFilePath(key);
                const stats = require('fs').statSync(filePath);
                totalSize += stats.size;

                if (!lastModified || stats.mtime > lastModified) {
                    lastModified = stats.mtime;
                }
            } catch (error) {
                // Ignore errors for individual files
            }
        }

        return {
            totalKeys: keys.length,
            totalSize,
            encryptionAvailable: this.isEncryptionAvailable,
            lastModified
        };
    }

    /**
     * Validate storage key
     */
    private validateKey(key: string): void {
        if (!key || typeof key !== 'string') {
            throw new Error('Invalid key: must be a non-empty string');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
            throw new Error('Invalid key: only alphanumeric characters, underscores, and hyphens allowed');
        }
        if (key.length > 255) {
            throw new Error('Invalid key: maximum length is 255 characters');
        }
    }

    /**
     * Get file path for key
     */
    private getFilePath(key: string): string {
        return join(this.storageDir, `${key}.json`);
    }

    /**
     * Create backup of existing file
     */
    private createBackup(key: string): void {
        try {
            const filePath = this.getFilePath(key);
            const backupPath = join(this.backupDir, `${key}-${Date.now()}.json`);
            const content = readFileSync(filePath);
            writeFileSync(backupPath, content);
        } catch (error) {
            console.warn(`Failed to create backup for ${key}:`, error);
        }
    }

    /**
     * Calculate checksum for data integrity
     */
    private calculateChecksum(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Compress data using gzip
     */
    private compress(data: string): string {
        const zlib = require('zlib');
        return zlib.gzipSync(data).toString('base64');
    }

    /**
     * Decompress data using gzip
     */
    private decompress(data: string): string {
        const zlib = require('zlib');
        return zlib.gunzipSync(Buffer.from(data, 'base64')).toString();
    }

    /**
     * Cleanup old backups
     */
    async cleanupBackups(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
        try {
            const files = require('fs').readdirSync(this.backupDir);
            const now = Date.now();

            for (const file of files) {
                const filePath = join(this.backupDir, file);
                const stats = require('fs').statSync(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    unlinkSync(filePath);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup backups:', error);
        }
    }
}

/**
 * Global secure storage instance
 */
export const secureStorage = new SecureStorageService();
