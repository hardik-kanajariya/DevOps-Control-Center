import {
    VPSServer,
    DirectDeploymentRequest,
    DirectDeploymentResult,
    DirectDeploymentStepResult,
    ServerStats,
    SSHConnectionTestResult,
    SuggestedDeployPath,
    PermissionConfig
} from '../../shared/types';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import * as crypto from 'crypto';
import { AuthService } from './auth';

export class ServerManagementService extends EventEmitter {
    private servers: Map<string, VPSServer> = new Map();
    private connections: Map<string, Client> = new Map();
    private dbPath: string;
    private statsInterval: NodeJS.Timeout | null = null;

    constructor() {
        super();
        const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'devops-control-center');
        this.dbPath = path.join(appDataPath, 'servers.json');
        this.initializeService();
    }

    private shellQuote(value: string): string {
        const stringValue = value ?? '';
        return `'${stringValue.replace(/'/g, `'\''`)}'`;
    }

    private sanitizeTargetPath(targetPath: string): void {
        if (!targetPath || targetPath.trim().length === 0) {
            throw new Error('Deployment target path is required');
        }

        const normalized = path.posix.normalize(targetPath);
        if (normalized === '/' || normalized === '.' || normalized === '..') {
            throw new Error('Deployment target path is not allowed to be root or relative to root');
        }

        if (normalized.startsWith('..') || normalized.includes('/../')) {
            throw new Error('Deployment target path cannot traverse parent directories');
        }
    }

    private redactSensitive(text: string, secrets: string[]): string {
        if (!text) {
            return '';
        }

        let redacted = text;
        secrets
            .filter(secret => Boolean(secret))
            .forEach(secret => {
                if (!secret) return;
                const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                redacted = redacted.replace(new RegExp(escaped, 'g'), '***');
            });
        return redacted;
    }

    private async ensureConnected(serverId: string): Promise<void> {
        const server = this.servers.get(serverId);
        if (!server) {
            throw new Error('Server not found');
        }

        if (server.status === 'connected' && this.connections.has(serverId)) {
            return;
        }

        const result = await this.connectToServer(serverId);
        if (!result.success) {
            throw new Error(result.error || 'Failed to establish SSH connection');
        }
    }

    private async initializeService(): Promise<void> {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            await fs.mkdir(dir, { recursive: true });

            // Load existing servers
            await this.loadServers();

            // Start monitoring
            this.startMonitoring();

            console.log('ServerManagementService initialized');
        } catch (error) {
            console.error('Failed to initialize ServerManagementService:', error);
        }
    }

    private async loadServers(): Promise<void> {
        try {
            const data = await fs.readFile(this.dbPath, 'utf-8');
            const serversArray: VPSServer[] = JSON.parse(data);

            this.servers.clear();
            serversArray.forEach(server => {
                // Set initial status as disconnected
                server.status = 'disconnected';
                this.servers.set(server.id, server);
            });

            console.log(`Loaded ${this.servers.size} servers`);
        } catch (error) {
            if ((error as any).code === 'ENOENT') {
                console.log('No existing servers file, starting fresh');
                this.servers.clear();
                await this.saveServers();
            } else {
                console.error('Error loading servers:', error);
            }
        }
    }

    private async saveServers(): Promise<void> {
        try {
            const serversArray = Array.from(this.servers.values());
            await fs.writeFile(this.dbPath, JSON.stringify(serversArray, null, 2));
        } catch (error) {
            console.error('Error saving servers:', error);
            throw error;
        }
    }

    private startMonitoring(): void {
        // Check server status every 30 seconds
        this.statsInterval = setInterval(async () => {
            await this.checkAllServersStatus();
        }, 30000);
    }

    private async checkAllServersStatus(): Promise<void> {
        for (const server of this.servers.values()) {
            if (server.status === 'connected') {
                await this.checkServerHealth(server.id);
            }
        }
    }

    public async getServers(): Promise<VPSServer[]> {
        return Array.from(this.servers.values());
    }

    public async addServer(serverData: Omit<VPSServer, 'id' | 'status'>): Promise<VPSServer> {
        const server: VPSServer = {
            ...serverData,
            id: crypto.randomUUID(),
            status: 'disconnected'
        };

        this.servers.set(server.id, server);
        await this.saveServers();

        this.emit('server-added', server);
        return server;
    }

    public async updateServer(serverId: string, updates: Partial<VPSServer>): Promise<VPSServer> {
        const server = this.servers.get(serverId);
        if (!server) {
            throw new Error('Server not found');
        }

        const updatedServer = { ...server, ...updates };
        this.servers.set(serverId, updatedServer);
        await this.saveServers();

        this.emit('server-updated', updatedServer);
        return updatedServer;
    }

    public async deleteServer(serverId: string): Promise<void> {
        const server = this.servers.get(serverId);
        if (!server) {
            throw new Error('Server not found');
        }

        // Disconnect if connected
        if (server.status === 'connected') {
            await this.disconnectFromServer(serverId);
        }

        this.servers.delete(serverId);
        await this.saveServers();

        this.emit('server-deleted', serverId);
    }

    public async connectToServer(serverId: string): Promise<{ success: boolean; error?: string }> {
        const server = this.servers.get(serverId);
        if (!server) {
            throw new Error('Server not found');
        }

        try {
            // Update status to connecting
            server.status = 'connecting';
            this.servers.set(serverId, server);
            this.emit('server-status-changed', { serverId, status: 'connecting' });

            const client = new Client();

            return new Promise(async (resolve) => {
                client.on('ready', async () => {
                    this.connections.set(serverId, client);
                    server.status = 'connected';
                    server.lastConnected = new Date();
                    this.servers.set(serverId, server);
                    await this.saveServers();

                    this.emit('server-status-changed', { serverId, status: 'connected' });
                    resolve({ success: true });
                });

                client.on('error', async (error: Error) => {
                    server.status = 'error';
                    this.servers.set(serverId, server);
                    this.emit('server-status-changed', { serverId, status: 'error' });
                    resolve({ success: false, error: error.message });
                });

                client.on('close', async () => {
                    this.connections.delete(serverId);
                    if (server.status === 'connected') {
                        server.status = 'disconnected';
                        this.servers.set(serverId, server);
                        this.emit('server-status-changed', { serverId, status: 'disconnected' });
                    }
                });

                // Connection configuration
                const connectConfig: ConnectConfig = {
                    host: server.host,
                    port: server.port,
                    username: server.username,
                    readyTimeout: 10000,
                    keepaliveInterval: 30000
                };

                if (server.privateKeyPath) {
                    try {
                        const privateKey = await fs.readFile(server.privateKeyPath, 'utf-8');
                        connectConfig.privateKey = privateKey;
                        client.connect(connectConfig);
                    } catch (keyError) {
                        server.status = 'error';
                        this.servers.set(serverId, server);
                        this.emit('server-status-changed', { serverId, status: 'error' });
                        resolve({ success: false, error: `Failed to read private key: ${keyError}` });
                        return;
                    }
                } else if (server.privateKey) {
                    connectConfig.privateKey = server.privateKey;
                    client.connect(connectConfig);
                } else if (server.password) {
                    connectConfig.password = server.password;
                    client.connect(connectConfig);
                } else {
                    server.status = 'error';
                    this.servers.set(serverId, server);
                    this.emit('server-status-changed', { serverId, status: 'error' });
                    resolve({ success: false, error: 'No authentication method provided' });
                    return;
                }
            });
        } catch (error) {
            server.status = 'error';
            this.servers.set(serverId, server);
            this.emit('server-status-changed', { serverId, status: 'error' });
            return { success: false, error: (error as Error).message };
        }
    }

    public async disconnectFromServer(serverId: string): Promise<void> {
        const connection = this.connections.get(serverId);
        const server = this.servers.get(serverId);

        if (connection) {
            connection.end();
            this.connections.delete(serverId);
        }

        if (server) {
            server.status = 'disconnected';
            this.servers.set(serverId, server);
            await this.saveServers();
            this.emit('server-status-changed', { serverId, status: 'disconnected' });
        }
    }

    public async executeCommand(serverId: string, command: string): Promise<{ stdout: string; stderr: string; code: number }> {
        const connection = this.connections.get(serverId);
        const server = this.servers.get(serverId);

        if (!connection || !server || server.status !== 'connected') {
            throw new Error('Server not connected');
        }

        return new Promise((resolve, reject) => {
            connection.exec(command, (err: Error | undefined, stream: ClientChannel) => {
                if (err) {
                    reject(err);
                    return;
                }

                let stdout = '';
                let stderr = '';

                stream.on('close', (code: number) => {
                    resolve({ stdout, stderr, code });
                }).on('data', (data: Buffer) => {
                    stdout += data.toString();
                }).stderr.on('data', (data: Buffer) => {
                    stderr += data.toString();
                });
            });
        });
    }

    public async getServerStats(serverId: string): Promise<ServerStats> {
        try {
            const commands = {
                cpu: "top -bn1 | grep 'Cpu(s)' | awk '{print 100 - $8}'",
                memory: "free -b | grep '^Mem:' | awk '{printf \"%d %d %.1f\", $3, $2, ($3/$2)*100}'",
                disk: "df -B1 / | tail -1 | awk '{printf \"%d %d %.1f\", $3, $2, ($3/$2)*100}'",
                uptime: "cat /proc/uptime | awk '{print $1}'",
                loadavg: "cat /proc/loadavg | awk '{print $1, $2, $3}'"
            };

            const results = await Promise.all([
                this.executeCommand(serverId, commands.cpu),
                this.executeCommand(serverId, commands.memory),
                this.executeCommand(serverId, commands.disk),
                this.executeCommand(serverId, commands.uptime),
                this.executeCommand(serverId, commands.loadavg)
            ]);

            const cpuCommand = results[0];
            const memoryCommand = results[1];
            const diskCommand = results[2];
            const cpu = parseFloat(cpuCommand.stdout.trim()) || 0;
            const [memUsed, memTotal, memPercent] = memoryCommand.stdout.trim().split(/\s+/).map(Number);
            const [diskUsed, diskTotal, diskPercent] = diskCommand.stdout.trim().split(/\s+/).map(Number);
            const uptime = parseFloat(results[3].stdout.trim()) || 0;
            const loadAverage = results[4].stdout.trim().split(' ').map(Number);

            const stats: ServerStats = {
                cpu: Math.round(cpu * 100) / 100,
                memory: {
                    used: memUsed || 0,
                    total: memTotal || 0,
                    percentage: Math.round((memPercent || 0) * 100) / 100
                },
                disk: {
                    used: diskUsed || 0,
                    total: diskTotal || 0,
                    percentage: Math.round((diskPercent || 0) * 100) / 100
                },
                uptime: Math.round(uptime),
                loadAverage: loadAverage.slice(0, 3) || [0, 0, 0]
            };

            const server = this.servers.get(serverId);
            if (server) {
                server.cpu = stats.cpu;
                server.memory = stats.memory.percentage;
                server.disk = stats.disk.percentage;
                server.uptimeSeconds = stats.uptime;
                server.loadAverage = stats.loadAverage;
                server.lastSeen = new Date();
                this.servers.set(serverId, server);
            }

            this.emit('server-stats', { serverId, stats });

            return stats;
        } catch (error) {
            console.error(`Error getting stats for server ${serverId}:`, error);
            return {
                cpu: 0,
                memory: { used: 0, total: 0, percentage: 0 },
                disk: { used: 0, total: 0, percentage: 0 },
                uptime: 0,
                loadAverage: [0, 0, 0]
            };
        }
    }

    private async checkServerHealth(serverId: string): Promise<void> {
        try {
            await this.getServerStats(serverId);
        } catch (error) {
            console.error(`Health check failed for server ${serverId}:`, error);
            const server = this.servers.get(serverId);
            if (server && server.status === 'connected') {
                server.status = 'error';
                this.servers.set(serverId, server);
                this.emit('server-status-changed', { serverId, status: 'error' });
            }
        }
    }

    public async getServerLogs(serverId: string, lines: number = 100): Promise<string> {
        try {
            const result = await this.executeCommand(serverId, `tail -n ${lines} /var/log/syslog`);
            return result.stdout;
        } catch (error) {
            throw new Error(`Failed to get logs: ${(error as Error).message}`);
        }
    }

    public async testConnection(serverData: Omit<VPSServer, 'id' | 'status'>): Promise<{ success: boolean; error?: string }> {
        const client = new Client();

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                client.destroy();
                resolve({ success: false, error: 'Connection timeout' });
            }, 10000);

            client.on('ready', () => {
                clearTimeout(timeout);
                client.end();
                resolve({ success: true });
            });

            client.on('error', (error: Error) => {
                clearTimeout(timeout);
                resolve({ success: false, error: error.message });
            });

            const connectConfig: ConnectConfig = {
                host: serverData.host,
                port: serverData.port,
                username: serverData.username,
                readyTimeout: 10000
            };

            if (serverData.privateKeyPath) {
                fs.readFile(serverData.privateKeyPath, 'utf-8')
                    .then(privateKey => {
                        connectConfig.privateKey = privateKey;
                        client.connect(connectConfig);
                    })
                    .catch(keyError => {
                        clearTimeout(timeout);
                        resolve({ success: false, error: `Failed to read private key: ${keyError}` });
                    });
            } else if (serverData.privateKey) {
                connectConfig.privateKey = serverData.privateKey;
                client.connect(connectConfig);
            } else if (serverData.password) {
                connectConfig.password = serverData.password;
                client.connect(connectConfig);
            } else {
                clearTimeout(timeout);
                resolve({ success: false, error: 'No authentication method provided' });
            }
        });
    }

    /**
     * Test connection and return detailed server information
     */
    public async testConnectionDetailed(serverId: string): Promise<SSHConnectionTestResult> {
        const server = this.servers.get(serverId);
        if (!server) {
            return {
                success: false,
                host: '',
                username: '',
                authenticationType: 'key',
                error: 'Server not found'
            };
        }

        const startTime = Date.now();

        try {
            await this.ensureConnected(serverId);

            // Get detailed system info
            const [osInfo, kernelInfo, whoami, homeDir] = await Promise.all([
                this.executeCommand(serverId, 'cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'').catch(() => ({ stdout: '' })),
                this.executeCommand(serverId, 'uname -r').catch(() => ({ stdout: '' })),
                this.executeCommand(serverId, 'whoami').catch(() => ({ stdout: '' })),
                this.executeCommand(serverId, 'echo $HOME').catch(() => ({ stdout: '' }))
            ]);

            const connectionTime = Date.now() - startTime;

            return {
                success: true,
                host: server.host,
                username: server.username,
                authenticationType: (server.privateKeyPath || server.privateKey) ? 'key' : 'password',
                osInfo: osInfo.stdout.trim() || undefined,
                kernelVersion: kernelInfo.stdout.trim() || undefined,
                homeDirectory: homeDir.stdout.trim() || undefined,
                currentUser: whoami.stdout.trim() || undefined,
                connectionTime
            };
        } catch (error) {
            return {
                success: false,
                host: server.host,
                username: server.username,
                authenticationType: (server.privateKeyPath || server.privateKey) ? 'key' : 'password',
                error: (error as Error).message,
                connectionTime: Date.now() - startTime
            };
        }
    }

    /**
     * Upload a public SSH key to the server's authorized_keys
     */
    public async uploadPublicKeyToServer(serverId: string, publicKey: string): Promise<{ success: boolean; error?: string }> {
        try {
            await this.ensureConnected(serverId);

            // Validate public key format
            if (!publicKey.startsWith('ssh-') && !publicKey.startsWith('ecdsa-')) {
                throw new Error('Invalid public key format');
            }

            // Escape the key for shell
            const escapedKey = this.shellQuote(publicKey.trim());

            // Create .ssh directory if it doesn't exist and add the key
            const script = `
set -e
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
KEY=${escapedKey}
if ! grep -qF "$KEY" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "$KEY" >> ~/.ssh/authorized_keys
    echo "Key added successfully"
else
    echo "Key already exists"
fi
`;
            const result = await this.executeCommand(serverId, `bash -c ${this.shellQuote(script)}`);

            if (result.code !== 0) {
                throw new Error(result.stderr || 'Failed to add public key');
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Detect common deployment paths on the server
     */
    public async detectDeployPaths(serverId: string): Promise<SuggestedDeployPath[]> {
        try {
            await this.ensureConnected(serverId);

            const paths: SuggestedDeployPath[] = [];

            // Define common paths to check
            const pathsToCheck = [
                { path: '/var/www/html', type: 'webroot' as const, description: 'Apache default webroot' },
                { path: '/var/www', type: 'webroot' as const, description: 'Common webroot parent' },
                { path: '/usr/share/nginx/html', type: 'webroot' as const, description: 'Nginx default webroot' },
                { path: '/srv/www', type: 'webroot' as const, description: 'Alternative webroot' },
                { path: '~/www', type: 'home' as const, description: 'User www directory' },
                { path: '~/public_html', type: 'home' as const, description: 'User public_html directory' },
                { path: '~/apps', type: 'home' as const, description: 'User apps directory' },
                { path: '/opt/apps', type: 'var' as const, description: 'Optional apps directory' },
            ];

            // Get home directory
            const homeResult = await this.executeCommand(serverId, 'echo $HOME');
            const homeDir = homeResult.stdout.trim();

            for (const pathInfo of pathsToCheck) {
                // Expand ~ to home directory
                const expandedPath = pathInfo.path.replace('~', homeDir);

                const checkScript = `
if [ -d "${expandedPath}" ]; then
    echo "exists"
    if [ -w "${expandedPath}" ]; then
        echo "writable"
    else
        echo "not_writable"
    fi
else
    echo "not_exists"
fi
`;
                const result = await this.executeCommand(serverId, checkScript);
                const lines = result.stdout.trim().split('\n');

                paths.push({
                    path: expandedPath,
                    type: pathInfo.type,
                    exists: lines[0] === 'exists',
                    writable: lines[1] === 'writable',
                    description: pathInfo.description
                });
            }

            // Sort: existing and writable first
            paths.sort((a, b) => {
                if (a.exists && a.writable && (!b.exists || !b.writable)) return -1;
                if (b.exists && b.writable && (!a.exists || !a.writable)) return 1;
                if (a.exists && !b.exists) return -1;
                if (b.exists && !a.exists) return 1;
                return 0;
            });

            return paths;
        } catch (error) {
            console.error('Error detecting deploy paths:', error);
            return [];
        }
    }

    /**
     * Setup file permissions for a deployed application
     */
    public async setupPermissions(
        serverId: string,
        targetPath: string,
        config: PermissionConfig
    ): Promise<{ success: boolean; error?: string }> {
        try {
            this.sanitizeTargetPath(targetPath);
            await this.ensureConnected(serverId);

            const {
                owner = 'www-data',
                group = 'www-data',
                fileMode = '644',
                dirMode = '755',
                recursive = true
            } = config;

            const commands: string[] = [];

            // Change ownership
            if (owner || group) {
                const ownerGroup = `${owner}:${group}`;
                commands.push(`chown ${recursive ? '-R' : ''} ${ownerGroup} ${this.shellQuote(targetPath)}`);
            }

            // Set directory permissions
            if (dirMode && recursive) {
                commands.push(`find ${this.shellQuote(targetPath)} -type d -exec chmod ${dirMode} {} \\;`);
            }

            // Set file permissions  
            if (fileMode && recursive) {
                commands.push(`find ${this.shellQuote(targetPath)} -type f -exec chmod ${fileMode} {} \\;`);
            }

            const script = `set -e\n${commands.join('\n')}`;
            const result = await this.executeCommand(serverId, `sudo bash -c ${this.shellQuote(script)}`);

            if (result.code !== 0) {
                // Try without sudo
                const resultNoSudo = await this.executeCommand(serverId, `bash -c ${this.shellQuote(script)}`);
                if (resultNoSudo.code !== 0) {
                    throw new Error(resultNoSudo.stderr || 'Failed to set permissions');
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Create git hooks for a deployed repository
     */
    public async createGitHooks(
        serverId: string,
        repoPath: string,
        hooks: { name: string; script: string }[]
    ): Promise<{ success: boolean; error?: string }> {
        try {
            this.sanitizeTargetPath(repoPath);
            await this.ensureConnected(serverId);

            for (const hook of hooks) {
                const hookPath = `${repoPath}/.git/hooks/${hook.name}`;
                const escapedScript = this.shellQuote(hook.script);

                const commands = `
set -e
cat > ${this.shellQuote(hookPath)} << 'HOOK_EOF'
${hook.script}
HOOK_EOF
chmod +x ${this.shellQuote(hookPath)}
`;
                const result = await this.executeCommand(serverId, `bash -c ${this.shellQuote(commands)}`);

                if (result.code !== 0) {
                    throw new Error(`Failed to create hook ${hook.name}: ${result.stderr}`);
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    public async directDeploy(request: DirectDeploymentRequest): Promise<DirectDeploymentResult> {
        const {
            serverId,
            repository,
            branch,
            targetPath,
            clean = false,
            useGitHubPat = true,
            preDeployScript,
            postDeployScript,
            environmentVariables = {}
        } = request;

        const server = this.servers.get(serverId);
        if (!server) {
            throw new Error('Server not found');
        }

        this.sanitizeTargetPath(targetPath);

        await this.ensureConnected(serverId);

        const secrets: string[] = [];
        let authenticatedCloneUrl = repository.cloneUrl;

        if (useGitHubPat) {
            const token = await AuthService.getToken();
            if (!token) {
                throw new Error('GitHub personal access token is not configured. Please set it before deploying.');
            }
            secrets.push(token);
            try {
                const repoUrl = new URL(repository.cloneUrl);
                repoUrl.username = 'x-access-token';
                repoUrl.password = token;
                authenticatedCloneUrl = repoUrl.toString();
            } catch (error) {
                throw new Error(`Invalid repository clone URL: ${(error as Error).message}`);
            }
        }

        const invalidEnvKey = Object.keys(environmentVariables).find(key => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key));
        if (invalidEnvKey) {
            throw new Error(`Invalid environment variable key: ${invalidEnvKey}`);
        }

        const steps: DirectDeploymentStepResult[] = [];
        const overallStart = new Date();

        const runStep = async (name: string, command: string): Promise<void> => {
            const startedAt = new Date();
            const result = await this.executeCommand(serverId, command);
            const finishedAt = new Date();

            const step: DirectDeploymentStepResult = {
                id: crypto.randomUUID(),
                name,
                command: this.redactSensitive(command, secrets),
                stdout: this.redactSensitive(result.stdout, secrets),
                stderr: this.redactSensitive(result.stderr, secrets),
                code: result.code,
                startedAt: startedAt.toISOString(),
                finishedAt: finishedAt.toISOString(),
                success: result.code === 0
            };

            steps.push(step);

            if (result.code !== 0) {
                throw new Error(step.stderr || `Step "${name}" failed with exit code ${result.code}`);
            }
        };

        try {
            if (clean) {
                const cleanScript = `set -e\nTARGET=${this.shellQuote(targetPath)}\nif [ -d "$TARGET" ]; then\n  rm -rf "$TARGET"\nfi`;
                await runStep('Clean target directory', `bash -lc ${this.shellQuote(cleanScript)}`);
            }

            const ensureDirScript = `set -e\nmkdir -p ${this.shellQuote(targetPath)}`;
            await runStep('Ensure target directory', `bash -lc ${this.shellQuote(ensureDirScript)}`);

            if (preDeployScript && preDeployScript.trim().length > 0) {
                const preScript = `set -e\ncd ${this.shellQuote(targetPath)}\n${preDeployScript}`;
                await runStep('Pre-deploy script', `bash -lc ${this.shellQuote(preScript)}`);
            }

            const envExports = Object.entries(environmentVariables)
                .map(([key, value]) => `export ${key}=${this.shellQuote(value)}`)
                .join('\n');

            const deployScriptLines = [
                'set -e',
                envExports,
                `TARGET=${this.shellQuote(targetPath)}`,
                `BRANCH=${this.shellQuote(branch)}`,
                `AUTH_URL=${this.shellQuote(authenticatedCloneUrl)}`,
                `PLAIN_URL=${this.shellQuote(repository.cloneUrl)}`,
                'if [ ! -d "$TARGET" ]; then',
                '  mkdir -p "$TARGET"',
                'fi',
                'if [ -d "$TARGET/.git" ]; then',
                '  git -C "$TARGET" fetch origin',
                '  git -C "$TARGET" checkout "$BRANCH"',
                '  git -C "$TARGET" reset --hard "origin/$BRANCH"',
                'else',
                '  git clone --branch "$BRANCH" "$AUTH_URL" "$TARGET"',
                '  git -C "$TARGET" remote set-url origin "$PLAIN_URL"',
                'fi'
            ].filter(Boolean).join('\n');

            await runStep('Synchronize repository', `bash -lc ${this.shellQuote(deployScriptLines)}`);

            if (postDeployScript && postDeployScript.trim().length > 0) {
                const postScript = `set -e\ncd ${this.shellQuote(targetPath)}\n${postDeployScript}`;
                await runStep('Post-deploy script', `bash -lc ${this.shellQuote(postScript)}`);
            }

            const overallEnd = new Date();
            const result: DirectDeploymentResult = {
                success: true,
                serverId,
                repository,
                branch,
                targetPath,
                steps,
                startedAt: overallStart.toISOString(),
                finishedAt: overallEnd.toISOString()
            };

            this.emit('server-deployment-finished', result);
            return result;
        } catch (error) {
            const overallEnd = new Date();
            const result: DirectDeploymentResult = {
                success: false,
                serverId,
                repository,
                branch,
                targetPath,
                steps,
                startedAt: overallStart.toISOString(),
                finishedAt: overallEnd.toISOString(),
                error: (error as Error).message
            };

            this.emit('server-deployment-finished', result);
            return result;
        }
    }

    public cleanup(): void {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }

        // Close all connections
        for (const connection of this.connections.values()) {
            connection.end();
        }
        this.connections.clear();
    }
}

// Singleton instance
export const serverManagementService = new ServerManagementService();
