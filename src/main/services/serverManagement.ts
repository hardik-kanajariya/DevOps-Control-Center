import { VPSServer } from '../../shared/types';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import * as crypto from 'crypto';

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

    public async getServerStats(serverId: string): Promise<{
        cpu: number;
        memory: { used: number; total: number; percentage: number };
        disk: { used: number; total: number; percentage: number };
        uptime: number;
        loadAverage: number[];
    }> {
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

            const cpu = parseFloat(results[0].stdout.trim()) || 0;
            const [memUsed, memTotal, memPercent] = results[1].stdout.trim().split(' ').map(Number);
            const [diskUsed, diskTotal, diskPercent] = results[2].stdout.trim().split(' ').map(Number);
            const uptime = parseFloat(results[3].stdout.trim()) || 0;
            const loadAverage = results[4].stdout.trim().split(' ').map(Number);

            return {
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
            const stats = await this.getServerStats(serverId);
            this.emit('server-stats', { serverId, stats });
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
            } else if (serverData.password) {
                connectConfig.password = serverData.password;
                client.connect(connectConfig);
            } else {
                clearTimeout(timeout);
                resolve({ success: false, error: 'No authentication method provided' });
            }
        });
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
