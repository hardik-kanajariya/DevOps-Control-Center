import { Octokit } from '@octokit/rest';
import { AuthService } from './auth';
import { GitHubRepository, GitHubDeployKey } from '../../shared/types';

export class GitHubService {
    private static octokit: Octokit | null = null;

    static initialize(): void {
        console.log('GitHubService initialized');
    }

    private static async getOctokit(): Promise<Octokit> {
        const token = await AuthService.getToken();
        if (!token) {
            throw new Error('No GitHub token available');
        }

        if (!this.octokit) {
            this.octokit = new Octokit({ auth: token });
        }

        return this.octokit;
    }

    static async getRepositories(): Promise<GitHubRepository[]> {
        const octokit = await this.getOctokit();

        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 100,
        });

        return data.map(repo => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || undefined,
            private: repo.private,
            html_url: repo.html_url,
            clone_url: repo.clone_url,
            ssh_url: repo.ssh_url,
            default_branch: repo.default_branch,
            language: repo.language || undefined,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            open_issues_count: repo.open_issues_count,
            pushed_at: repo.pushed_at || '',
            created_at: repo.created_at || '',
            updated_at: repo.updated_at || '',
        }));
    }

    static async getRepository(repoName: string): Promise<GitHubRepository> {
        const octokit = await this.getOctokit();
        const user = await AuthService.getCurrentUser();

        const { data } = await octokit.rest.repos.get({
            owner: user.login,
            repo: repoName,
        });

        return {
            id: data.id,
            name: data.name,
            full_name: data.full_name,
            description: data.description || undefined,
            private: data.private,
            html_url: data.html_url,
            clone_url: data.clone_url,
            ssh_url: data.ssh_url,
            default_branch: data.default_branch,
            language: data.language || undefined,
            stargazers_count: data.stargazers_count,
            forks_count: data.forks_count,
            open_issues_count: data.open_issues_count,
            pushed_at: data.pushed_at || '',
            created_at: data.created_at || '',
            updated_at: data.updated_at || '',
        };
    }

    static async getWorkflowRuns(repoName: string) {
        const octokit = await this.getOctokit();
        const user = await AuthService.getCurrentUser();

        const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
            owner: user.login,
            repo: repoName,
            per_page: 50,
        });

        return data.workflow_runs;
    }

    /**
     * Add a deploy key to a repository
     */
    static async addDeployKey(
        repoName: string,
        publicKey: string,
        title: string,
        readOnly: boolean = true
    ): Promise<GitHubDeployKey> {
        const octokit = await this.getOctokit();
        const user = await AuthService.getCurrentUser();

        const { data } = await octokit.rest.repos.createDeployKey({
            owner: user.login,
            repo: repoName,
            title,
            key: publicKey,
            read_only: readOnly
        });

        return {
            id: data.id,
            key: data.key,
            url: data.url,
            title: data.title,
            verified: data.verified,
            created_at: data.created_at,
            read_only: data.read_only ?? true
        };
    }

    /**
     * List deploy keys for a repository
     */
    static async listDeployKeys(repoName: string): Promise<GitHubDeployKey[]> {
        const octokit = await this.getOctokit();
        const user = await AuthService.getCurrentUser();

        const { data } = await octokit.rest.repos.listDeployKeys({
            owner: user.login,
            repo: repoName,
            per_page: 100
        });

        return data.map(key => ({
            id: key.id,
            key: key.key,
            url: key.url,
            title: key.title,
            verified: key.verified,
            created_at: key.created_at,
            read_only: key.read_only ?? true
        }));
    }

    /**
     * Delete a deploy key from a repository
     */
    static async deleteDeployKey(repoName: string, keyId: number): Promise<void> {
        const octokit = await this.getOctokit();
        const user = await AuthService.getCurrentUser();

        await octokit.rest.repos.deleteDeployKey({
            owner: user.login,
            repo: repoName,
            key_id: keyId
        });
    }

    static resetConnection(): void {
        this.octokit = null;
    }
}
