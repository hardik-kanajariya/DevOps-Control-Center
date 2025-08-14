import { GitHubService } from './github';
import { AuthService } from './auth';
import { DashboardService } from './dashboard';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { GitHubRepository } from '../../shared/types';

export interface CloneProgress {
    progress: number;
    status: string;
    currentStep: string;
}

export interface RepositoryAnalytics {
    totalCommits: number;
    contributors: number;
    lastActivity: string;
    fileCount: number;
    size: string;
    mainLanguage: string;
    languages: Record<string, number>;
}

export class RepositoryService {
    private static cloneOperations: Map<string, boolean> = new Map();

    static initialize(): void {
        console.log('RepositoryService initialized');
    }

    /**
     * Get all repositories for the authenticated user
     */
    static async getRepositories(): Promise<GitHubRepository[]> {
        try {
            const isAuthenticated = await AuthService.isAuthenticated();
            if (!isAuthenticated) {
                throw new Error('Not authenticated with GitHub');
            }

            const repositories = await GitHubService.getRepositories();

            // Add activity to dashboard
            DashboardService.addActivity({
                type: 'repository',
                title: 'Repositories Loaded',
                description: `Loaded ${repositories.length} repositories from GitHub`,
                status: 'info'
            });

            return repositories;
        } catch (error) {
            console.error('Error fetching repositories:', error);

            DashboardService.addActivity({
                type: 'error',
                title: 'Repository Fetch Failed',
                description: `Failed to load repositories: ${(error as Error).message}`,
                status: 'error'
            });

            throw error;
        }
    }

    /**
     * Get a specific repository by name
     */
    static async getRepository(repoName: string): Promise<GitHubRepository> {
        try {
            const repository = await GitHubService.getRepository(repoName);

            DashboardService.addActivity({
                type: 'repository',
                title: 'Repository Details Loaded',
                description: `Loaded details for ${repository.full_name}`,
                status: 'info',
                repository: repository.name
            });

            return repository;
        } catch (error) {
            console.error('Error fetching repository:', error);
            throw error;
        }
    }

    /**
     * Clone a repository to local path
     */
    static async cloneRepository(
        repoUrl: string,
        localPath: string,
        useSSH: boolean = false,
        onProgress?: (progress: CloneProgress) => void
    ): Promise<void> {
        const repoName = this.extractRepoNameFromUrl(repoUrl);
        const cloneKey = `${repoName}_${Date.now()}`;

        if (this.cloneOperations.has(repoName)) {
            throw new Error('Clone operation already in progress for this repository');
        }

        try {
            this.cloneOperations.set(repoName, true);

            // Validate inputs
            if (!repoUrl || !localPath) {
                throw new Error('Repository URL and local path are required');
            }

            // Check if target directory exists
            const targetPath = path.resolve(localPath);
            if (fs.existsSync(targetPath)) {
                throw new Error('Target directory already exists');
            }

            // Ensure parent directory exists
            const parentDir = path.dirname(targetPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            onProgress?.({
                progress: 10,
                status: 'Initializing clone operation...',
                currentStep: 'setup'
            });

            // Add activity to dashboard
            DashboardService.addActivity({
                type: 'repository',
                title: 'Repository Clone Started',
                description: `Cloning ${repoName} to ${localPath}`,
                status: 'info',
                repository: repoName
            });

            // Execute git clone
            await this.executeGitClone(repoUrl, targetPath, onProgress);

            // Add success activity
            DashboardService.addActivity({
                type: 'repository',
                title: 'Repository Clone Completed',
                description: `Successfully cloned ${repoName} to ${localPath}`,
                status: 'success',
                repository: repoName
            });

            onProgress?.({
                progress: 100,
                status: 'Clone completed successfully',
                currentStep: 'complete'
            });

        } catch (error) {
            console.error('Clone operation failed:', error);

            DashboardService.addActivity({
                type: 'error',
                title: 'Repository Clone Failed',
                description: `Failed to clone ${repoName}: ${(error as Error).message}`,
                status: 'error',
                repository: repoName
            });

            throw error;
        } finally {
            this.cloneOperations.delete(repoName);
        }
    }

    /**
     * Execute git clone command
     */
    private static executeGitClone(
        repoUrl: string,
        targetPath: string,
        onProgress?: (progress: CloneProgress) => void
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            onProgress?.({
                progress: 20,
                status: 'Starting git clone...',
                currentStep: 'clone'
            });

            const gitArgs = ['clone', repoUrl, targetPath, '--progress'];
            const gitProcess = spawn('git', gitArgs);

            let stderr = '';
            let hasError = false;

            gitProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('Git stdout:', output);

                // Parse git clone progress
                const progress = this.parseGitProgress(output);
                if (progress > 20) {
                    onProgress?.({
                        progress: Math.min(progress, 90),
                        status: 'Cloning repository...',
                        currentStep: 'downloading'
                    });
                }
            });

            gitProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.log('Git stderr:', output);

                // Git outputs progress to stderr for some reason
                const progress = this.parseGitProgress(output);
                if (progress > 20) {
                    onProgress?.({
                        progress: Math.min(progress, 90),
                        status: 'Cloning repository...',
                        currentStep: 'downloading'
                    });
                }
            });

            gitProcess.on('error', (error) => {
                hasError = true;
                console.error('Git process error:', error);
                reject(new Error(`Git command failed: ${error.message}`));
            });

            gitProcess.on('close', (code) => {
                if (hasError) return; // Error already handled

                if (code === 0) {
                    onProgress?.({
                        progress: 95,
                        status: 'Finalizing...',
                        currentStep: 'finalize'
                    });
                    resolve();
                } else {
                    reject(new Error(`Git clone failed with exit code ${code}: ${stderr}`));
                }
            });
        });
    }

    /**
     * Parse git progress output
     */
    private static parseGitProgress(output: string): number {
        // Look for progress patterns in git output
        const progressMatch = output.match(/(\d+)%/);
        if (progressMatch) {
            return parseInt(progressMatch[1], 10);
        }

        // Look for "Receiving objects" or "Resolving deltas"
        if (output.includes('Receiving objects:')) {
            return 40;
        }
        if (output.includes('Resolving deltas:')) {
            return 70;
        }
        if (output.includes('Checking out files:')) {
            return 85;
        }

        return 0;
    }

    /**
     * Extract repository name from URL
     */
    private static extractRepoNameFromUrl(url: string): string {
        const match = url.match(/\/([^\/]+)\.git$/);
        if (match) {
            return match[1];
        }

        // Fallback for URLs without .git extension
        const parts = url.split('/');
        return parts[parts.length - 1] || 'unknown-repo';
    }

    /**
     * Check if repository exists locally
     */
    static async checkLocalRepository(localPath: string): Promise<boolean> {
        try {
            const targetPath = path.resolve(localPath);
            return fs.existsSync(targetPath) && fs.existsSync(path.join(targetPath, '.git'));
        } catch (error) {
            return false;
        }
    }

    /**
     * Get repository analytics
     */
    static async getRepositoryAnalytics(repoName: string): Promise<RepositoryAnalytics> {
        try {
            // This would typically fetch from GitHub API or local analysis
            // For now, return mock data
            return {
                totalCommits: Math.floor(Math.random() * 1000) + 50,
                contributors: Math.floor(Math.random() * 20) + 1,
                lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                fileCount: Math.floor(Math.random() * 500) + 10,
                size: `${(Math.random() * 100).toFixed(1)} MB`,
                mainLanguage: 'TypeScript',
                languages: {
                    'TypeScript': 65,
                    'JavaScript': 20,
                    'CSS': 10,
                    'HTML': 5
                }
            };
        } catch (error) {
            console.error('Error fetching repository analytics:', error);
            throw error;
        }
    }

    /**
     * Search repositories
     */
    static async searchRepositories(query: string, filters?: {
        language?: string;
        visibility?: 'public' | 'private' | 'all';
        sort?: 'updated' | 'created' | 'name' | 'stars';
    }): Promise<GitHubRepository[]> {
        try {
            const allRepositories = await this.getRepositories();

            let filtered = allRepositories;

            // Apply search query
            if (query.trim()) {
                const searchTerm = query.toLowerCase();
                filtered = filtered.filter(repo =>
                    repo.name.toLowerCase().includes(searchTerm) ||
                    repo.description?.toLowerCase().includes(searchTerm) ||
                    repo.language?.toLowerCase().includes(searchTerm)
                );
            }

            // Apply filters
            if (filters) {
                if (filters.language) {
                    filtered = filtered.filter(repo => repo.language === filters.language);
                }

                if (filters.visibility && filters.visibility !== 'all') {
                    filtered = filtered.filter(repo =>
                        filters.visibility === 'private' ? repo.private : !repo.private
                    );
                }

                // Apply sorting
                if (filters.sort) {
                    filtered.sort((a, b) => {
                        switch (filters.sort) {
                            case 'name':
                                return a.name.localeCompare(b.name);
                            case 'stars':
                                return b.stargazers_count - a.stargazers_count;
                            case 'created':
                                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                            case 'updated':
                            default:
                                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                        }
                    });
                }
            }

            return filtered;
        } catch (error) {
            console.error('Error searching repositories:', error);
            throw error;
        }
    }

    /**
     * Get repository workflows
     */
    static async getRepositoryWorkflows(repoName: string) {
        try {
            return await GitHubService.getWorkflowRuns(repoName);
        } catch (error) {
            console.error('Error fetching repository workflows:', error);
            throw error;
        }
    }

    /**
     * Open repository in external browser
     */
    static async openRepositoryInBrowser(htmlUrl: string): Promise<void> {
        try {
            const { shell } = require('electron');
            await shell.openExternal(htmlUrl);

            DashboardService.addActivity({
                type: 'repository',
                title: 'Repository Opened',
                description: 'Opened repository in external browser',
                status: 'info'
            });
        } catch (error) {
            console.error('Error opening repository in browser:', error);
            throw error;
        }
    }

    /**
     * Get clone operations status
     */
    static getActiveCloneOperations(): string[] {
        return Array.from(this.cloneOperations.keys());
    }
}
