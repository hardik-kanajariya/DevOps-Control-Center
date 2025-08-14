import { AuthService } from './auth';
import { GitHubService } from './github';
import * as os from 'os';
import * as fs from 'fs';
import { ActivityItem, SystemHealth, DashboardStats, DeploymentMetrics, ServiceStatus } from '../../shared/types';

export class DashboardService {
    private static recentActivity: ActivityItem[] = [];
    private static deploymentMetrics: DeploymentMetrics = {
        totalDeployments: 0,
        successRate: 0,
        averageDeployTime: 0,
        deploymentsToday: 0,
        failedDeployments: 0
    };

    static initialize(): void {
        console.log('DashboardService initialized');
        this.loadStoredData();
    }

    /**
     * Get comprehensive dashboard statistics
     */
    static async getDashboardStats(): Promise<DashboardStats> {
        try {
            const [repositories, systemHealth] = await Promise.all([
                this.getRepositoriesCount(),
                this.getSystemHealth()
            ]);

            const stats: DashboardStats = {
                repositoriesCount: repositories,
                successfulDeployments: this.deploymentMetrics.totalDeployments - this.deploymentMetrics.failedDeployments,
                activePipelines: await this.getActivePipelines(),
                connectedServers: await this.getConnectedServers(),
                recentActivity: this.recentActivity.slice(0, 10),
                systemHealth,
                deploymentMetrics: this.deploymentMetrics
            };

            return stats;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }

    /**
     * Get recent activity items
     */
    static getRecentActivity(limit: number = 10): ActivityItem[] {
        return this.recentActivity.slice(0, limit);
    }

    /**
     * Get system health information
     */
    static async getSystemHealth(): Promise<SystemHealth> {
        const cpuUsage = await this.getCPUUsage();
        const memoryUsage = this.getMemoryUsage();
        const diskUsage = await this.getDiskUsage();
        const networkStatus = await this.getNetworkStatus();
        const services = await this.getServiceStatuses();

        return {
            cpu: cpuUsage,
            memory: memoryUsage,
            disk: diskUsage,
            network: networkStatus,
            services
        };
    }

    /**
     * Add new activity item
     */
    static addActivity(activity: Omit<ActivityItem, 'id' | 'timestamp'>): void {
        const newActivity: ActivityItem = {
            ...activity,
            id: this.generateId(),
            timestamp: new Date().toISOString()
        };

        this.recentActivity.unshift(newActivity);

        // Keep only the latest 100 activities
        this.recentActivity = this.recentActivity.slice(0, 100);

        this.saveStoredData();
    }

    /**
     * Update deployment metrics
     */
    static updateDeploymentMetrics(deployment: {
        success: boolean;
        duration?: number;
    }): void {
        this.deploymentMetrics.totalDeployments++;

        if (deployment.success) {
            const successfulDeployments = this.deploymentMetrics.totalDeployments - this.deploymentMetrics.failedDeployments;
            this.deploymentMetrics.successRate = (successfulDeployments / this.deploymentMetrics.totalDeployments) * 100;

            if (deployment.duration) {
                // Update average deploy time
                const currentAvg = this.deploymentMetrics.averageDeployTime;
                const totalSuccessful = successfulDeployments;
                this.deploymentMetrics.averageDeployTime =
                    ((currentAvg * (totalSuccessful - 1)) + deployment.duration) / totalSuccessful;
            }
        } else {
            this.deploymentMetrics.failedDeployments++;
            this.deploymentMetrics.successRate =
                ((this.deploymentMetrics.totalDeployments - this.deploymentMetrics.failedDeployments) /
                    this.deploymentMetrics.totalDeployments) * 100;
        }

        // Check if deployment is today
        const today = new Date().toDateString();
        const deploymentDate = new Date().toDateString();
        if (today === deploymentDate) {
            this.deploymentMetrics.deploymentsToday++;
        }

        this.saveStoredData();
    }

    /**
     * Get repositories count
     */
    private static async getRepositoriesCount(): Promise<number> {
        try {
            const isAuthenticated = await AuthService.isAuthenticated();
            if (!isAuthenticated) {
                return 0;
            }

            const repositories = await GitHubService.getRepositories();
            return repositories.length;
        } catch (error) {
            console.warn('Could not fetch repositories count:', error);
            return 0;
        }
    }

    /**
     * Get active pipelines count (mock implementation)
     */
    private static async getActivePipelines(): Promise<number> {
        // This would integrate with CI/CD services like GitHub Actions, Jenkins, etc.
        // For now, return a mock value
        return Math.floor(Math.random() * 5);
    }

    /**
     * Get connected servers count (mock implementation)
     */
    private static async getConnectedServers(): Promise<number> {
        // This would check actual server connections
        // For now, return a mock value
        return Math.floor(Math.random() * 3);
    }

    /**
     * Get CPU usage percentage
     */
    private static async getCPUUsage(): Promise<number> {
        return new Promise((resolve) => {
            const startMeasure = process.cpuUsage();
            const startTime = process.hrtime();

            setTimeout(() => {
                const currentMeasure = process.cpuUsage(startMeasure);
                const currentTime = process.hrtime(startTime);

                const totalTime = currentTime[0] * 1e6 + currentTime[1] * 1e-3;
                const totalUsage = currentMeasure.user + currentMeasure.system;
                const cpuPercent = (totalUsage / totalTime) * 100;

                resolve(Math.min(Math.max(cpuPercent, 0), 100));
            }, 100);
        });
    }

    /**
     * Get memory usage percentage
     */
    private static getMemoryUsage(): number {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        return Math.round((usedMemory / totalMemory) * 100);
    }

    /**
     * Get disk usage percentage
     */
    private static async getDiskUsage(): Promise<number> {
        try {
            // This is a simplified implementation
            // In a real application, you'd check the actual disk where the app is running
            const stats = fs.statSync(process.cwd());
            // Return a mock value for now
            return Math.floor(Math.random() * 60) + 20; // 20-80%
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get network status
     */
    private static async getNetworkStatus(): Promise<'online' | 'offline' | 'limited'> {
        try {
            // Simple network check by trying to resolve a DNS
            const { promisify } = require('util');
            const dns = require('dns');
            const lookup = promisify(dns.lookup);

            await lookup('github.com');
            return 'online';
        } catch (error) {
            return 'offline';
        }
    }

    /**
     * Get service statuses
     */
    private static async getServiceStatuses(): Promise<ServiceStatus[]> {
        const services: ServiceStatus[] = [
            {
                name: 'GitHub API',
                status: 'running',
                uptime: Date.now() - (Math.random() * 86400000), // Random uptime up to 1 day
                lastCheck: new Date().toISOString()
            },
            {
                name: 'Docker Engine',
                status: Math.random() > 0.2 ? 'running' : 'stopped',
                uptime: Date.now() - (Math.random() * 86400000),
                lastCheck: new Date().toISOString()
            },
            {
                name: 'SSH Connections',
                status: Math.random() > 0.1 ? 'running' : 'error',
                uptime: Date.now() - (Math.random() * 86400000),
                lastCheck: new Date().toISOString()
            },
            {
                name: 'Auto-updater',
                status: 'running',
                uptime: Date.now() - (Math.random() * 86400000),
                lastCheck: new Date().toISOString()
            }
        ];

        return services;
    }

    /**
     * Generate unique ID
     */
    private static generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Load stored data from persistence
     */
    private static loadStoredData(): void {
        try {
            // This would load from a persistent storage
            // For now, initialize with some sample data
            this.initializeSampleData();
        } catch (error) {
            console.warn('Could not load stored dashboard data:', error);
            this.initializeSampleData();
        }
    }

    /**
     * Save data to persistence
     */
    private static saveStoredData(): void {
        try {
            // This would save to a persistent storage
            // Implementation would use the secure storage service
        } catch (error) {
            console.warn('Could not save dashboard data:', error);
        }
    }

    /**
     * Initialize with sample data
     */
    private static initializeSampleData(): void {
        this.recentActivity = [
            {
                id: '1',
                type: 'deployment',
                title: 'Deployment Successful',
                description: 'Production deployment completed successfully',
                timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
                status: 'success',
                repository: 'my-web-app',
                server: 'production-server'
            },
            {
                id: '2',
                type: 'repository',
                title: 'New Repository Added',
                description: 'Added repository: new-project',
                timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
                status: 'info',
                repository: 'new-project'
            },
            {
                id: '3',
                type: 'server',
                title: 'Server Connection Established',
                description: 'Successfully connected to staging server',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                status: 'success',
                server: 'staging-server'
            },
            {
                id: '4',
                type: 'workflow',
                title: 'CI/CD Pipeline Started',
                description: 'GitHub Actions workflow triggered for main branch',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
                status: 'info',
                repository: 'my-web-app'
            },
            {
                id: '5',
                type: 'error',
                title: 'Deployment Failed',
                description: 'Build failed due to test failures',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
                status: 'error',
                repository: 'feature-branch-app'
            }
        ];

        this.deploymentMetrics = {
            totalDeployments: 24,
            successRate: 87.5,
            averageDeployTime: 180, // 3 minutes in seconds
            deploymentsToday: 3,
            failedDeployments: 3
        };
    }

    /**
     * Refresh all dashboard data
     */
    static async refreshStats(): Promise<DashboardStats> {
        return this.getDashboardStats();
    }
}
