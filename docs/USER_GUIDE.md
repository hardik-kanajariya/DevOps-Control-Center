# DevOps Control Center - User Documentation

## Overview

The DevOps Control Center is a comprehensive CI/CD management tool built with Electron.js that provides a unified interface for managing GitHub repositories, deployments, VPS servers, and DevOps workflows.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Repository Management](#repository-management)
4. [Workflow Management](#workflow-management)
5. [Real-time Monitoring](#real-time-monitoring)
6. [Docker Management](#docker-management)
7. [Database Management](#database-management)
8. [Server Management](#server-management)
9. [Pipeline Management](#pipeline-management)
10. [Settings](#settings)
11. [Auto-Updates](#auto-updates)
12. [Troubleshooting](#troubleshooting)

## Getting Started

### System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 1GB free space
- **Network**: Internet connection required for GitHub integration

### Installation

1. Download the latest installer for your platform from the releases page
2. Run the installer and follow the setup wizard
3. Launch the application from your desktop or applications folder

### First Launch

1. The application will open to the authentication screen
2. You'll need a GitHub Personal Access Token (PAT) to proceed
3. Follow the authentication guide below to get started

## Authentication

### Setting up GitHub Authentication

1. **Generate a Personal Access Token (PAT)**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Click "Generate new token (classic)"
   - Select the following scopes:
     - `repo` - Full control of private repositories
     - `workflow` - Update GitHub Action workflows
     - `read:user` - Read user profile data
     - `read:org` - Read organization data

2. **Enter Token in Application**:
   - Paste your token in the authentication field
   - Click "Authenticate"
   - The application will validate your token and load your repositories

3. **Multiple Accounts**:
   - The application supports multiple GitHub accounts
   - Switch between accounts using the account selector in settings

## Repository Management

### Viewing Repositories

- Navigate to the **Repositories** section from the sidebar
- View all your public and private repositories
- Filter repositories by name, language, or status
- Sort by creation date, last update, or stars

### Repository Details

Each repository shows:
- **Basic Information**: Name, description, language, stars, forks
- **Recent Activity**: Latest commits, pull requests, issues
- **Workflow Status**: Current CI/CD pipeline status
- **Quick Actions**: Clone, open in browser, manage workflows

### Repository Operations

- **Clone Repository**: Clone to a local directory for development
- **Branch Management**: Create, switch, and manage branches
- **File Browser**: Browse repository files with syntax highlighting
- **Commit History**: View detailed commit history and changes

## Workflow Management

### Visual Workflow Builder

The Visual Workflow Builder provides a drag-and-drop interface for creating GitHub Actions workflows:

1. **Adding Nodes**:
   - Drag workflow nodes from the sidebar to the canvas
   - Available node types: Triggers, Actions, Conditions, Deployments

2. **Connecting Nodes**:
   - Click on output ports to start connections
   - Click on input ports to complete connections
   - Create complex workflow logic with branching and merging

3. **Node Configuration**:
   - Select nodes to view their properties
   - Configure triggers, actions, and conditions
   - Set environment variables and secrets

4. **YAML Generation**:
   - Automatically generate GitHub Actions YAML
   - Copy generated code to clipboard
   - Save workflows directly to repository

### Code Editor

- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **Live Validation**: Real-time YAML syntax checking
- **IntelliSense**: Auto-completion for GitHub Actions syntax
- **Template Library**: Pre-built workflow templates for common scenarios

### Workflow Templates

Available templates:
- **Node.js CI/CD**: Build, test, and deploy Node.js applications
- **Docker Build**: Build and push Docker images
- **Static Site Deployment**: Deploy to GitHub Pages, Netlify, Vercel
- **Custom Templates**: Create and save your own workflow templates

## Real-time Monitoring

### Server Health Monitoring

The monitoring dashboard provides real-time insights into your infrastructure:

1. **System Metrics**:
   - CPU usage with historical charts
   - Memory utilization and availability
   - Disk space usage and I/O operations
   - Network traffic (upload/download speeds)

2. **Service Status**:
   - Running services and their health status
   - Port monitoring and availability
   - Process monitoring with resource usage
   - Alert notifications for critical issues

3. **Performance Analytics**:
   - Historical performance trends
   - Performance bottleneck identification
   - Resource optimization suggestions
   - Custom metric tracking

### Alerts and Notifications

- **Threshold Alerts**: Configure CPU, memory, and disk usage thresholds
- **Service Monitoring**: Get notified when services go down
- **Email Notifications**: Send alerts via email (configuration required)
- **In-App Notifications**: Real-time notifications within the application

## Docker Management

### Container Operations

The Docker management interface provides comprehensive container lifecycle management:

1. **Container List**:
   - View all running and stopped containers
   - Real-time status updates and resource usage
   - Quick actions: start, stop, restart, remove

2. **Container Details**:
   - Live CPU and memory usage charts
   - Port mappings and network configuration
   - Environment variables and volumes
   - Container logs with real-time tailing

3. **Image Management**:
   - List all Docker images
   - Pull images from Docker Hub
   - Build images from Dockerfiles
   - Image history and layer analysis

4. **Network Management**:
   - Create and manage Docker networks
   - Network topology visualization
   - Container network assignments
   - Port forwarding configuration

5. **Volume Management**:
   - Persistent storage management
   - Volume backup and restore
   - Storage usage analytics
   - Mount point configuration

### Docker Compose Support

- **Compose File Editor**: Edit docker-compose.yml files with syntax highlighting
- **Multi-Container Deployment**: Deploy complex applications with multiple containers
- **Service Management**: Start, stop, and scale services
- **Log Aggregation**: View logs from all services in one interface

## Database Management

### Supported Databases

The application supports multiple database types:
- **PostgreSQL**: Full support for PostgreSQL 9.6+
- **MySQL**: Compatible with MySQL 5.7+ and MariaDB
- **MongoDB**: Support for MongoDB 3.6+
- **Redis**: Redis 4.0+ support with pub/sub
- **SQLite**: Local SQLite database management

### Connection Management

1. **Adding Connections**:
   - Enter connection details (host, port, credentials)
   - Test connection before saving
   - Save frequently used connections for quick access

2. **Connection Security**:
   - Encrypted credential storage
   - SSL/TLS connection support
   - SSH tunnel support for secure connections
   - Connection pooling for performance

### Database Operations

1. **Query Editor**:
   - SQL syntax highlighting and auto-completion
   - Execute queries with results visualization
   - Query history and favorites
   - Export results to CSV, JSON, or Excel

2. **Schema Browser**:
   - Browse database schemas and tables
   - View table structures and relationships
   - Index and constraint information
   - Data type analysis

3. **Performance Monitoring**:
   - Real-time database metrics
   - Query performance analysis
   - Connection pool monitoring
   - Database health insights

### Backup and Restore

- **Automated Backups**: Schedule regular database backups
- **Manual Backups**: On-demand backup creation
- **Restore Operations**: Restore from backup files
- **Backup Management**: Organize and manage backup files

## Server Management

### VPS Server Integration

1. **Adding Servers**:
   - Enter server details (IP, SSH port, credentials)
   - SSH key authentication support
   - Connection testing and validation

2. **Server Monitoring**:
   - Real-time server health metrics
   - Resource usage tracking
   - Service status monitoring
   - Alert configuration

3. **Remote Operations**:
   - Integrated SSH terminal
   - File manager for remote file operations
   - Service management (systemctl integration)
   - Log viewer with real-time updates

### Security Management

- **SSH Key Management**: Generate, import, and manage SSH keys
- **Firewall Configuration**: UFW and iptables integration
- **SSL Certificate Management**: Let's Encrypt integration
- **User Management**: Create and manage server users

## Pipeline Management

### CI/CD Pipeline Overview

1. **Pipeline Visualization**:
   - Visual representation of pipeline stages
   - Real-time status updates
   - Step-by-step execution tracking
   - Error highlighting and debugging

2. **Pipeline Configuration**:
   - Environment variable management
   - Secret management with encryption
   - Artifact handling and storage
   - Deployment target configuration

3. **Deployment Management**:
   - One-click deployments to multiple environments
   - Rollback functionality with version control
   - Blue-green deployment support
   - Canary deployment strategies

### Build Management

- **Build Triggers**: Automated builds on code changes
- **Build Artifacts**: Manage and store build outputs
- **Build Cache**: Optimize build times with intelligent caching
- **Build Notifications**: Get notified about build status

## Settings

### Application Settings

1. **General Settings**:
   - Theme selection (light mode default)
   - Language preferences
   - Notification settings
   - Auto-update preferences

2. **GitHub Integration**:
   - Multiple account management
   - Token refresh and validation
   - API rate limit monitoring
   - Webhook configuration

3. **Performance Settings**:
   - Memory usage optimization
   - Cache management
   - Background sync preferences
   - Resource monitoring intervals

### Data Management

- **Export Settings**: Export application configuration
- **Import Settings**: Import configuration from backup
- **Clear Cache**: Clear application cache and temporary files
- **Reset Application**: Reset to factory defaults

## Auto-Updates

### Update Management

The application includes automatic update functionality:

1. **Update Checking**:
   - Automatic check on startup
   - Manual update checking
   - Update notifications in the UI
   - Release notes display

2. **Update Installation**:
   - Automatic download of updates
   - Background installation
   - Restart prompt when ready
   - Rollback option if issues occur

3. **Update Settings**:
   - Enable/disable automatic updates
   - Choose update channel (stable/beta)
   - Configure update check frequency
   - Notification preferences

### Version Information

- **Current Version**: Display current application version
- **Update History**: View previous updates and changes
- **Release Notes**: Detailed information about each release
- **System Information**: View system and dependency versions

## Troubleshooting

### Common Issues

1. **Authentication Problems**:
   - **Issue**: "Invalid token" error
   - **Solution**: Regenerate GitHub PAT with correct scopes
   - **Prevention**: Ensure token has required permissions

2. **Connection Issues**:
   - **Issue**: Cannot connect to GitHub/servers
   - **Solution**: Check network connectivity and firewall settings
   - **Prevention**: Configure proxy settings if required

3. **Performance Issues**:
   - **Issue**: Application running slowly
   - **Solution**: Clear cache and restart application
   - **Prevention**: Monitor memory usage in settings

### Error Reporting

1. **Application Logs**:
   - Access logs through Help → Show Logs
   - Logs include detailed error information
   - Share logs when reporting issues

2. **Bug Reporting**:
   - Use the built-in bug reporting feature
   - Include steps to reproduce the issue
   - Attach relevant log files

### Support Resources

- **Documentation**: Built-in help system with searchable content
- **Community Forum**: Join the community for support and tips
- **GitHub Issues**: Report bugs and request features
- **Email Support**: Contact support team for critical issues

### Backup and Recovery

1. **Configuration Backup**:
   - Regular automatic backups of settings
   - Manual backup export functionality
   - Cloud sync option for settings

2. **Data Recovery**:
   - Restore from configuration backups
   - Reset to default configuration
   - Recovery mode for corrupted installations

## Advanced Features

### Custom Integrations

- **API Access**: REST API for third-party integrations
- **Webhook Support**: Receive events from external services
- **Plugin System**: Extend functionality with custom plugins
- **Scripting Support**: Automate tasks with custom scripts

### Enterprise Features

- **Team Management**: Multi-user support with role-based access
- **Audit Logging**: Detailed audit trails for compliance
- **SSO Integration**: Single sign-on with corporate systems
- **Custom Branding**: White-label options for enterprises

---

## Need Help?

If you need additional assistance:

1. Check the built-in help system (F1)
2. Visit our documentation website
3. Join our community forum
4. Contact support via email

**Version**: 1.0.0  
**Last Updated**: August 14, 2025  
**Author**: hardikkanajariya.in
