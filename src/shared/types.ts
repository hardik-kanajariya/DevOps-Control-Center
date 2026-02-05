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
    hostname: string;
    ip: string;
    port: number;
    username: string;
    privateKeyPath?: string;
    privateKey?: string;
    password?: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    environment: 'development' | 'staging' | 'production';
    os?: string;
    lastConnected?: Date;
    lastSeen?: Date;
    tags: string[];
    cpu?: number;
    memory?: number;
    disk?: number;
    uptimeSeconds?: number;
    loadAverage?: number[];
}

// SSH Key Management Types
export interface SSHKeyGenerationOptions {
    name: string;
    type?: 'ed25519' | 'rsa';
    passphrase?: string;
    comment?: string;
}

export interface SSHKeyInfo {
    name: string;
    type: 'ed25519' | 'rsa';
    privateKeyPath: string;
    publicKeyPath: string;
    publicKey: string;
    fingerprint: string;
    createdAt: string;
    hasPassphrase: boolean;
}

export interface SSHKeyPair extends SSHKeyInfo {
    // SSHKeyInfo already has all fields, this interface is for newly generated keys
}

export interface SSHConnectionTestResult {
    success: boolean;
    host: string;
    username: string;
    authenticationType: 'key' | 'password';
    osInfo?: string;
    kernelVersion?: string;
    homeDirectory?: string;
    currentUser?: string;
    connectionTime?: number;
    error?: string;
}

export interface SuggestedDeployPath {
    path: string;
    type: 'webroot' | 'home' | 'var' | 'custom';
    exists: boolean;
    writable: boolean;
    description: string;
}

export interface PermissionConfig {
    owner?: string;
    group?: string;
    fileMode?: string;
    dirMode?: string;
    recursive?: boolean;
}

export interface GitHubDeployKey {
    id: number;
    key: string;
    url: string;
    title: string;
    verified: boolean;
    created_at: string;
    read_only: boolean;
}

export interface ServerResourceUsage {
    used: number;
    total: number;
    percentage: number;
}

export interface ServerStats {
    cpu: number;
    memory: ServerResourceUsage;
    disk: ServerResourceUsage;
    uptime: number;
    loadAverage: number[];
}

export interface ServerLogsPayload {
    serverId: string;
    logs: string;
    lines: number;
    fetchedAt: string;
}

export interface ServerStatusPayload {
    serverId: string;
    status: VPSServer['status'];
}

export interface DirectDeploymentRepository {
    name: string;
    fullName: string;
    cloneUrl: string;
    defaultBranch: string;
}

export interface DirectDeploymentRequest {
    serverId: string;
    repository: DirectDeploymentRepository;
    branch: string;
    targetPath: string;
    clean?: boolean;
    useGitHubPat?: boolean;
    preDeployScript?: string;
    postDeployScript?: string;
    environmentVariables?: Record<string, string>;
}

export interface DirectDeploymentStepResult {
    id: string;
    name: string;
    command: string;
    stdout: string;
    stderr: string;
    code: number;
    startedAt: string;
    finishedAt: string;
    success: boolean;
}

export interface DirectDeploymentResult {
    success: boolean;
    serverId: string;
    repository: DirectDeploymentRepository;
    branch: string;
    targetPath: string;
    steps: DirectDeploymentStepResult[];
    startedAt: string;
    finishedAt: string;
    error?: string;
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
    run_number?: number;
    repository?: {
        owner: string;
        name: string;
        full_name: string;
    };
}

export interface WorkflowStep {
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out';
    number: number;
    started_at?: string;
    completed_at?: string;
}

export interface WorkflowJob {
    id: number;
    run_id: number;
    name: string;
    status: 'queued' | 'in_progress' | 'completed' | 'waiting';
    conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out';
    started_at?: string;
    completed_at?: string;
    html_url: string;
    steps: WorkflowStep[];
}

export interface AppSettings {
    theme: 'light' | 'dark';
    autoRefresh: boolean;
    refreshInterval: number;
    notifications: boolean;
    defaultClonePath: string;
    sshKeyPath: string;
}

// Dashboard related types
export interface ActivityItem {
    id: string;
    type: 'deployment' | 'repository' | 'server' | 'workflow' | 'error' | 'info';
    title: string;
    description: string;
    timestamp: string;
    status: 'success' | 'error' | 'warning' | 'info';
    repository?: string;
    server?: string;
    workflow?: string;
}

export interface SystemHealth {
    cpu: number;
    memory: number;
    disk: number;
    network: 'online' | 'offline' | 'limited';
    services: ServiceStatus[];
}

export interface ServiceStatus {
    name: string;
    status: 'running' | 'stopped' | 'error';
    uptime: number;
    lastCheck: string;
}

export interface DeploymentMetrics {
    totalDeployments: number;
    successRate: number;
    averageDeployTime: number;
    deploymentsToday: number;
    failedDeployments: number;
}

export interface DashboardStats {
    repositoriesCount: number;
    successfulDeployments: number;
    activePipelines: number;
    connectedServers: number;
    recentActivity: ActivityItem[];
    systemHealth: SystemHealth;
    deploymentMetrics: DeploymentMetrics;
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
    | 'repos:search'
    | 'repos:analytics'
    | 'repos:workflows'
    | 'repos:open-browser'
    | 'repos:check-local'
    | 'repos:add-deploy-key'
    | 'repos:list-deploy-keys'
    | 'repos:delete-deploy-key'
    | 'workflows:list-all'
    | 'workflows:list-repo'
    | 'workflows:get-yaml'
    | 'workflows:cancel'
    | 'workflows:rerun'
    | 'workflows:open-browser'
    | 'database:get-connections'
    | 'database:create-connection'
    | 'database:test-connection'
    | 'database:delete-connection'
    | 'database:get-tables'
    | 'database:execute-query'
    | 'database:get-metrics'
    | 'database:get-health'
    | 'database:get-query-history'
    | 'database:export-data'
    | 'database:open-external'
    | 'servers:list'
    | 'servers:add'
    | 'servers:update'
    | 'servers:delete'
    | 'servers:connect'
    | 'servers:disconnect'
    | 'servers:execute-command'
    | 'servers:get-stats'
    | 'servers:get-logs'
    | 'servers:test-connection'
    | 'servers:direct-deploy'
    | 'servers:upload-public-key'
    | 'servers:detect-deploy-paths'
    | 'servers:setup-permissions'
    | 'ssh-keys:generate'
    | 'ssh-keys:list'
    | 'ssh-keys:get'
    | 'ssh-keys:delete'
    | 'ssh-keys:import'
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
