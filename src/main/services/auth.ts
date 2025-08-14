import { safeStorage } from 'electron';
import { Octokit } from '@octokit/rest';
import Store from 'electron-store';

const store = new Store();

export class AuthService {
    private static token: string | null = null;
    private static readonly TOKEN_KEY = 'github_token';

    static async initialize(): Promise<void> {
        // Load stored token on initialization
        try {
            const storedToken = (store as any).get(this.TOKEN_KEY) as string | undefined;
            if (storedToken && safeStorage.isEncryptionAvailable()) {
                this.token = safeStorage.decryptString(Buffer.from(storedToken, 'base64'));
            }
        } catch (error) {
            console.warn('Failed to load stored token:', error);
        }
        console.log('AuthService initialized');
    }

    static async setToken(token: string): Promise<void> {
        try {
            // Validate token before storing
            const octokit = new Octokit({ auth: token });
            await octokit.rest.users.getAuthenticated();

            // Store encrypted token persistently
            if (safeStorage.isEncryptionAvailable()) {
                const encryptedToken = safeStorage.encryptString(token);
                (store as any).set(this.TOKEN_KEY, encryptedToken.toString('base64'));
                this.token = token;
            } else {
                throw new Error('Encryption not available on this system');
            }
        } catch (error) {
            throw new Error(`Invalid token: ${(error as Error).message}`);
        }
    }

    static async getToken(): Promise<string | null> {
        if (this.token) return this.token;

        // Try to load from storage if not in memory
        try {
            const storedToken = (store as any).get(this.TOKEN_KEY) as string | undefined;
            if (storedToken && safeStorage.isEncryptionAvailable()) {
                this.token = safeStorage.decryptString(Buffer.from(storedToken, 'base64'));
                return this.token;
            }
        } catch (error) {
            console.warn('Failed to load token from storage:', error);
        }

        return null;
    }

    static async validateToken(): Promise<boolean> {
        try {
            const token = await this.getToken();
            if (!token) return false;

            const octokit = new Octokit({ auth: token });
            await octokit.rest.users.getAuthenticated();
            return true;
        } catch {
            return false;
        }
    }

    static async isAuthenticated(): Promise<boolean> {
        const token = await this.getToken();
        return token !== null && await this.validateToken();
    }

    static async clearAuth(): Promise<void> {
        this.token = null;
        (store as any).delete(this.TOKEN_KEY);
    }

    static async getCurrentUser() {
        const token = await this.getToken();
        if (!token) throw new Error('No token available');

        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.rest.users.getAuthenticated();
        return data;
    }
}
