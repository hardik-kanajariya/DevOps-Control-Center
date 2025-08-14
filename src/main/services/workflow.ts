import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';
import { WorkflowRun } from '../../shared/types';
import { AuthService } from './auth';
import { DashboardService } from './dashboard';
import { app } from 'electron';

export class WorkflowService {
    private static instance: WorkflowService;
    private octokit: Octokit | null = null;
    private cachePath: string;

    private constructor() {
        this.cachePath = path.join(app.getPath('userData'), 'workflows-cache.json');
    }

    public static getInstance(): WorkflowService {
        if (!WorkflowService.instance) {
            WorkflowService.instance = new WorkflowService();
        }
        return WorkflowService.instance;
    }

    public static initialize(): void {
        WorkflowService.getInstance();
        console.log('WorkflowService initialized');
    }

    private async getOctokit(): Promise<Octokit> {
        if (!this.octokit) {
            const token = await AuthService.getToken();
            if (!token) {
                throw new Error('GitHub access token not available');
            }
            this.octokit = new Octokit({
                auth: token,
                userAgent: 'DevOps-Control-Center/1.0.0'
            });
        }
        return this.octokit;
    }

    /**
     * Get all workflow runs across all repositories
     */
    async getAllWorkflowRuns(): Promise<WorkflowRun[]> {
        try {
            const octokit = await this.getOctokit();

            // Get all repositories
            const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
                visibility: 'all',
                sort: 'updated',
                per_page: 50
            });

            const allWorkflowRuns: WorkflowRun[] = [];

            // Get workflow runs for each repository (limited for performance)
            for (const repo of repos.slice(0, 15)) {
                try {
                    const { data: workflowRuns } = await octokit.rest.actions.listWorkflowRunsForRepo({
                        owner: repo.owner.login,
                        repo: repo.name,
                        per_page: 10,
                        exclude_pull_requests: false
                    });

                    const formattedRuns = workflowRuns.workflow_runs.map((run: any) => ({
                        id: run.id,
                        name: run.name || 'Unnamed Workflow',
                        status: run.status as 'queued' | 'in_progress' | 'completed' | 'waiting',
                        conclusion: run.conclusion as 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | undefined,
                        workflow_id: run.workflow_id,
                        head_branch: run.head_branch || 'main',
                        created_at: run.created_at,
                        updated_at: run.updated_at,
                        html_url: run.html_url
                    }));

                    allWorkflowRuns.push(...formattedRuns);
                } catch (repoError) {
                    console.warn(`Failed to fetch workflows for ${repo.full_name}:`, repoError);
                }
            }

            // Sort by updated_at desc
            allWorkflowRuns.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

            // Cache the results
            this.saveToCache(allWorkflowRuns);

            // Track activity
            DashboardService.addActivity({
                type: 'workflow',
                title: 'Workflow Runs Synced',
                description: `Retrieved ${allWorkflowRuns.length} workflow runs from ${repos.length} repositories`,
                status: 'success',
                repository: 'All Repositories',
                workflow: 'GitHub Actions'
            });

            return allWorkflowRuns;
        } catch (error) {
            console.error('Failed to fetch workflow runs:', error);
            // Return cached data if available
            return this.loadFromCache();
        }
    }

    /**
     * Get workflow runs for a specific repository
     */
    async getRepositoryWorkflowRuns(owner: string, repo: string): Promise<WorkflowRun[]> {
        try {
            const octokit = await this.getOctokit();

            const { data: workflowRuns } = await octokit.rest.actions.listWorkflowRunsForRepo({
                owner,
                repo,
                per_page: 50
            });

            const formattedRuns = workflowRuns.workflow_runs.map((run: any) => ({
                id: run.id,
                name: run.name || 'Unnamed Workflow',
                status: run.status as 'queued' | 'in_progress' | 'completed' | 'waiting',
                conclusion: run.conclusion as 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | undefined,
                workflow_id: run.workflow_id,
                head_branch: run.head_branch || 'main',
                created_at: run.created_at,
                updated_at: run.updated_at,
                html_url: run.html_url
            }));

            return formattedRuns;
        } catch (error) {
            throw new Error(`Failed to fetch workflow runs for ${owner}/${repo}: ${error}`);
        }
    }

    /**
     * Get workflow YAML content
     */
    async getWorkflowYAML(owner: string, repo: string, workflowId: number): Promise<string> {
        try {
            const octokit = await this.getOctokit();

            // First get the workflow info to get the path
            const { data: workflow } = await octokit.rest.actions.getWorkflow({
                owner,
                repo,
                workflow_id: workflowId
            });

            const workflowPath = workflow.path;

            // Get the file content
            const { data: fileData } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: workflowPath
            });

            if ('content' in fileData) {
                const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                return content;
            } else {
                throw new Error('Workflow file not found');
            }
        } catch (error) {
            throw new Error(`Failed to fetch workflow YAML: ${error}`);
        }
    }

    /**
     * Cancel a workflow run
     */
    async cancelWorkflowRun(owner: string, repo: string, runId: number): Promise<void> {
        try {
            const octokit = await this.getOctokit();

            await octokit.rest.actions.cancelWorkflowRun({
                owner,
                repo,
                run_id: runId
            });

            DashboardService.addActivity({
                type: 'workflow',
                title: 'Workflow Cancelled',
                description: `Cancelled workflow run #${runId}`,
                status: 'warning',
                repository: `${owner}/${repo}`
            });
        } catch (error) {
            throw new Error(`Failed to cancel workflow run: ${error}`);
        }
    }

    /**
     * Re-run a workflow
     */
    async rerunWorkflow(owner: string, repo: string, runId: number): Promise<void> {
        try {
            const octokit = await this.getOctokit();

            await octokit.rest.actions.reRunWorkflow({
                owner,
                repo,
                run_id: runId
            });

            DashboardService.addActivity({
                type: 'workflow',
                title: 'Workflow Re-run',
                description: `Re-running workflow run #${runId}`,
                status: 'info',
                repository: `${owner}/${repo}`
            });
        } catch (error) {
            throw new Error(`Failed to re-run workflow: ${error}`);
        }
    }

    /**
     * Open workflow run in browser
     */
    async openWorkflowInBrowser(htmlUrl: string): Promise<void> {
        const { shell } = require('electron');
        await shell.openExternal(htmlUrl);

        DashboardService.addActivity({
            type: 'workflow',
            title: 'Workflow Opened',
            description: 'Opened workflow run in browser',
            status: 'info'
        });
    }

    private saveToCache(workflows: WorkflowRun[]): void {
        try {
            const cacheData = {
                workflows,
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync(this.cachePath, JSON.stringify(cacheData, null, 2));
        } catch (error) {
            console.warn('Failed to save workflows to cache:', error);
        }
    }

    private loadFromCache(): WorkflowRun[] {
        try {
            if (fs.existsSync(this.cachePath)) {
                const cacheData = JSON.parse(fs.readFileSync(this.cachePath, 'utf-8'));
                // Return cached data if it's less than 1 hour old
                const cacheTime = new Date(cacheData.timestamp).getTime();
                const now = new Date().getTime();
                if (now - cacheTime < 60 * 60 * 1000) { // 1 hour
                    return cacheData.workflows || [];
                }
            }
        } catch (error) {
            console.warn('Failed to load workflows from cache:', error);
        }
        return [];
    }
}
