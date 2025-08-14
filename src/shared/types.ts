// Shared types between main and renderer processes

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    description?: string;
    private: boolean;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    default_branch: string;
    language?: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    pushed_at: string;
    created_at: string;
    updated_at: string;
}

export interface GitHubUser {
    id: number;
    login: string;
    name?: string;
    email?: string;
    avatar_url: string;
    html_url: string;
    type: string;
    company?: string;
    location?: string;
    public_repos: number;
    followers: number;
    following: number;
}

export interface AuthConfig {
    token: string;
    username: string;
    expiresAt?: Date;
}

export interface VPSServer {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    lastConnected?: Date;
    tags: string[];
}

export interface DeploymentConfig {
    id: string;
    name: string;
    repositoryId: number;
    serverId: string;
    branch: string;
    buildCommand?: string;
    deployPath: string;
    envVars: Record<string, string>;
    preDeployScript?: string;
    postDeployScript?: string;
    isActive: boolean;
}

export interface WorkflowRun {
    id: number;
    name: string;
    status: 'queued' | 'in_progress' | 'completed' | 'waiting';
    conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out';
    workflow_id: number;
    head_branch: string;
    created_at: string;
    updated_at: string;
    html_url: string;
}

export interface AppSettings {
    theme: 'light' | 'dark';
    autoRefresh: boolean;
    refreshInterval: number;
    notifications: boolean;
    defaultClonePath: string;
    sshKeyPath: string;
}

// IPC Channel types
export type IPCChannels =
    | 'auth:set-token'
    | 'auth:get-token'
    | 'auth:validate-token'
    | 'auth:clear'
    | 'repos:list'
    | 'repos:get'
    | 'repos:clone'
    | 'servers:list'
    | 'servers:add'
    | 'servers:connect'
    | 'servers:disconnect'
    | 'deploy:create'
    | 'deploy:run'
    | 'deploy:history'
    | 'settings:get'
    | 'settings:set';

export interface IPCResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
