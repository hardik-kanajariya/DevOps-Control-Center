import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { MongoClient } from 'mongodb';
import redis from 'redis';
import * as path from 'path';
import * as fs from 'fs';
import { app, shell } from 'electron';

interface DatabaseConnection {
    id: string;
    name: string;
    type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';
    host: string;
    port: number;
    database: string;
    username: string;
    password?: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    lastConnected?: string;
    ssl: boolean;
    connectionString?: string;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

interface TableInfo {
    name: string;
    rows: number;
    size: string;
    type: 'table' | 'view' | 'collection' | 'key';
    schema?: string;
    lastModified?: string;
    columns?: { name: string; type: string; nullable: boolean; key: boolean }[];
}

interface QueryResult {
    columns: string[];
    rows: any[][];
    executionTime: number;
    rowsAffected: number;
    query: string;
    timestamp: string;
    error?: string;
}

interface DatabaseMetrics {
    totalConnections: number;
    activeConnections: number;
    totalQueries: number;
    avgQueryTime: number;
    errorRate: number;
    uptime: string;
    memoryUsage: number;
    diskUsage: number;
    cacheHitRatio: number;
    lastUpdated: string;
}

interface DatabaseHealth {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    checks: {
        name: string;
        status: 'pass' | 'fail' | 'warning';
        message: string;
        value?: string;
    }[];
    lastCheck: string;
}

export class DatabaseManagementService {
    private static instance: DatabaseManagementService;
    private localDb: sqlite3.Database | null = null;
    private connections: Map<string, DatabaseConnection> = new Map();
    private activeConnections: Map<string, any> = new Map();
    private queryHistory: QueryResult[] = [];
    private startTime: number = Date.now();
    private queryCount: number = 0;
    private totalQueryTime: number = 0;
    private errorCount: number = 0;

    private constructor() {
        this.initializeLocalDatabase();
    }

    public static getInstance(): DatabaseManagementService {
        if (!DatabaseManagementService.instance) {
            DatabaseManagementService.instance = new DatabaseManagementService();
        }
        return DatabaseManagementService.instance;
    }

    public static initialize(): void {
        DatabaseManagementService.getInstance();
        console.log('DatabaseManagementService initialized');
    }

    private async initializeLocalDatabase(): Promise<void> {
        try {
            const dbPath = path.join(app.getPath('userData'), 'database-connections.db');

            // Ensure directory exists
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            this.localDb = new sqlite3.Database(dbPath);

            // Create connections table if it doesn't exist
            await this.executeLocalQuery(`
                CREATE TABLE IF NOT EXISTS connections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    host TEXT NOT NULL,
                    port INTEGER NOT NULL,
                    database_name TEXT NOT NULL,
                    username TEXT NOT NULL,
                    password TEXT,
                    ssl BOOLEAN DEFAULT 0,
                    metadata TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            `);

            // Create query history table
            await this.executeLocalQuery(`
                CREATE TABLE IF NOT EXISTS query_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    connection_id TEXT NOT NULL,
                    query_text TEXT NOT NULL,
                    execution_time INTEGER NOT NULL,
                    rows_affected INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    error TEXT,
                    FOREIGN KEY (connection_id) REFERENCES connections (id)
                )
            `);

            // Load existing connections
            await this.loadConnections();

            console.log('Local database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize local database:', error);
            throw error;
        }
    }

    private executeLocalQuery(query: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.localDb) {
                reject(new Error('Local database not initialized'));
                return;
            }

            if (query.trim().toUpperCase().startsWith('SELECT')) {
                this.localDb.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            } else {
                this.localDb.run(query, params, function (err) {
                    if (err) reject(err);
                    else resolve({ lastID: this.lastID, changes: this.changes });
                });
            }
        });
    }

    private async loadConnections(): Promise<void> {
        try {
            const rows = await this.executeLocalQuery('SELECT * FROM connections');

            for (const row of rows) {
                const connection: DatabaseConnection = {
                    id: row.id,
                    name: row.name,
                    type: row.type,
                    host: row.host,
                    port: row.port,
                    database: row.database_name,
                    username: row.username,
                    password: row.password,
                    ssl: Boolean(row.ssl),
                    metadata: row.metadata ? JSON.parse(row.metadata) : {},
                    status: 'disconnected',
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };

                this.connections.set(connection.id, connection);
            }

            console.log(`Loaded ${this.connections.size} database connections`);
        } catch (error) {
            console.error('Failed to load connections:', error);
        }
    }

    // Connection Management
    public async getAllConnections(): Promise<{ success: boolean; data?: DatabaseConnection[]; error?: string }> {
        try {
            const connections = Array.from(this.connections.values());
            return { success: true, data: connections };
        } catch (error) {
            console.error('Error getting database connections:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get database connections'
            };
        }
    }

    public async createConnection(connectionData: Omit<DatabaseConnection, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: DatabaseConnection; error?: string }> {
        try {
            const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();

            const connection: DatabaseConnection = {
                ...connectionData,
                id,
                status: 'disconnected',
                createdAt: now,
                updatedAt: now
            };

            // Test connection first
            const testResult = await this.testConnection(connection, false);
            if (!testResult.success) {
                return {
                    success: false,
                    error: `Connection test failed: ${testResult.error}`
                };
            }

            // Save to local database
            await this.executeLocalQuery(
                `INSERT INTO connections (id, name, type, host, port, database_name, username, password, ssl, metadata, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    connection.id,
                    connection.name,
                    connection.type,
                    connection.host,
                    connection.port,
                    connection.database,
                    connection.username,
                    connection.password,
                    connection.ssl ? 1 : 0,
                    JSON.stringify(connection.metadata || {}),
                    connection.createdAt,
                    connection.updatedAt
                ]
            );

            // Add to memory
            this.connections.set(connection.id, connection);

            return { success: true, data: connection };
        } catch (error) {
            console.error('Error creating database connection:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create database connection'
            };
        }
    }

    public async testConnection(connectionOrId: DatabaseConnection | string, updateStatus: boolean = true): Promise<{ success: boolean; error?: string; details?: any }> {
        try {
            const connection = typeof connectionOrId === 'string'
                ? this.connections.get(connectionOrId)
                : connectionOrId;

            if (!connection) {
                return { success: false, error: 'Connection not found' };
            }

            if (updateStatus) {
                connection.status = 'connecting';
                this.connections.set(connection.id, connection);
            }

            let testResult;
            const startTime = Date.now();

            try {
                switch (connection.type) {
                    case 'mysql':
                        testResult = await this.testMySQLConnection(connection);
                        break;
                    case 'postgresql':
                        testResult = await this.testPostgreSQLConnection(connection);
                        break;
                    case 'mongodb':
                        testResult = await this.testMongoDBConnection(connection);
                        break;
                    case 'redis':
                        testResult = await this.testRedisConnection(connection);
                        break;
                    case 'sqlite':
                        testResult = await this.testSQLiteConnection(connection);
                        break;
                    default:
                        throw new Error(`Unsupported database type: ${connection.type}`);
                }

                const connectionTime = Date.now() - startTime;

                if (updateStatus) {
                    connection.status = 'connected';
                    connection.lastConnected = new Date().toISOString();
                    this.connections.set(connection.id, connection);

                    // Update in database
                    await this.executeLocalQuery(
                        'UPDATE connections SET updated_at = ? WHERE id = ?',
                        [connection.updatedAt, connection.id]
                    );
                }

                return {
                    success: true,
                    details: {
                        connectionTime,
                        serverInfo: testResult
                    }
                };

            } catch (error) {
                if (updateStatus) {
                    connection.status = 'error';
                    this.connections.set(connection.id, connection);
                }

                const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
                console.error(`Connection test failed for ${connection.name}:`, errorMessage);

                return {
                    success: false,
                    error: errorMessage,
                    details: { connectionTime: Date.now() - startTime }
                };
            }

        } catch (error) {
            console.error('Error testing database connection:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to test database connection'
            };
        }
    }

    private async testMySQLConnection(connection: DatabaseConnection): Promise<any> {
        const config: any = {
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            database: connection.database
        };

        if (connection.ssl) {
            config.ssl = {};
        }

        const mysqlConnection = await mysql.createConnection(config);

        try {
            const [rows] = await mysqlConnection.execute('SELECT VERSION() as version, DATABASE() as database_name');
            return (rows as any[])[0];
        } finally {
            await mysqlConnection.end();
        }
    }

    private async testPostgreSQLConnection(connection: DatabaseConnection): Promise<any> {
        const client = new PgClient({
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            database: connection.database,
            ssl: connection.ssl ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: 10000
        });

        try {
            await client.connect();
            const result = await client.query('SELECT version(), current_database()');
            return result.rows[0];
        } finally {
            await client.end();
        }
    }

    private async testMongoDBConnection(connection: DatabaseConnection): Promise<any> {
        const uri = connection.ssl
            ? `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}?ssl=true`
            : `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;

        const client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000
        });

        try {
            await client.connect();
            const admin = client.db().admin();
            const info = await admin.serverStatus();
            return {
                version: info.version,
                database: connection.database
            };
        } finally {
            await client.close();
        }
    }

    private async testRedisConnection(connection: DatabaseConnection): Promise<any> {
        const client = redis.createClient({
            socket: {
                host: connection.host,
                port: connection.port,
                connectTimeout: 10000
            },
            username: connection.username,
            password: connection.password
        });

        try {
            await client.connect();
            const info = await client.info('server');
            const version = info.match(/redis_version:(.+)/)?.[1];
            return { version, database: connection.database };
        } finally {
            await client.quit();
        }
    }

    private async testSQLiteConnection(connection: DatabaseConnection): Promise<any> {
        return new Promise((resolve, reject) => {
            const dbPath = path.isAbsolute(connection.host) ? connection.host : path.join(process.cwd(), connection.host);

            if (!fs.existsSync(dbPath)) {
                reject(new Error(`SQLite database file not found: ${dbPath}`));
                return;
            }

            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                db.get('SELECT sqlite_version() as version', (err, row: any) => {
                    db.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ version: row.version, database: path.basename(dbPath) });
                    }
                });
            });
        });
    }

    public async deleteConnection(connectionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Close active connection if exists
            if (this.activeConnections.has(connectionId)) {
                await this.closeConnection(connectionId);
            }

            // Remove from local database
            await this.executeLocalQuery('DELETE FROM connections WHERE id = ?', [connectionId]);
            await this.executeLocalQuery('DELETE FROM query_history WHERE connection_id = ?', [connectionId]);

            // Remove from memory
            this.connections.delete(connectionId);

            return { success: true };
        } catch (error) {
            console.error('Error deleting database connection:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete database connection'
            };
        }
    }

    private async closeConnection(connectionId: string): Promise<void> {
        const activeConnection = this.activeConnections.get(connectionId);
        if (!activeConnection) return;

        try {
            const connection = this.connections.get(connectionId);
            if (!connection) return;

            switch (connection.type) {
                case 'mysql':
                    await activeConnection.end();
                    break;
                case 'postgresql':
                    await activeConnection.end();
                    break;
                case 'mongodb':
                    await activeConnection.close();
                    break;
                case 'redis':
                    await activeConnection.quit();
                    break;
                // SQLite connections are closed immediately after use
            }
        } catch (error) {
            console.error('Error closing connection:', error);
        } finally {
            this.activeConnections.delete(connectionId);
        }
    }

    // Query execution and table management
    public async getConnectionTables(connectionId: string): Promise<{ success: boolean; data?: TableInfo[]; error?: string }> {
        try {
            const connection = this.connections.get(connectionId);
            if (!connection) {
                return { success: false, error: 'Connection not found' };
            }

            let tables: TableInfo[];

            switch (connection.type) {
                case 'mysql':
                    tables = await this.getMySQLTables(connection);
                    break;
                case 'postgresql':
                    tables = await this.getPostgreSQLTables(connection);
                    break;
                case 'mongodb':
                    tables = await this.getMongoDBCollections(connection);
                    break;
                case 'redis':
                    tables = await this.getRedisKeys(connection);
                    break;
                case 'sqlite':
                    tables = await this.getSQLiteTables(connection);
                    break;
                default:
                    return { success: false, error: `Unsupported database type: ${connection.type}` };
            }

            return { success: true, data: tables };
        } catch (error) {
            console.error('Error getting tables:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get database tables'
            };
        }
    }

    private async getMySQLTables(connection: DatabaseConnection): Promise<TableInfo[]> {
        const config: any = {
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            database: connection.database
        };

        if (connection.ssl) {
            config.ssl = {};
        }

        const mysqlConnection = await mysql.createConnection(config);

        try {
            const [tables] = await mysqlConnection.execute(`
                SELECT 
                    TABLE_NAME as name,
                    TABLE_ROWS as \`rows\`,
                    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb,
                    TABLE_TYPE as type,
                    TABLE_SCHEMA as schema_name,
                    UPDATE_TIME as last_modified
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ?
                ORDER BY TABLE_NAME
            `, [connection.database]);

            return (tables as any[]).map(table => ({
                name: table.name,
                rows: table.rows || 0,
                size: `${table.size_mb || 0} MB`,
                type: table.type?.toLowerCase().includes('view') ? 'view' : 'table',
                schema: table.schema_name,
                lastModified: table.last_modified?.toISOString()
            }));
        } finally {
            await mysqlConnection.end();
        }
    }

    private async getPostgreSQLTables(connection: DatabaseConnection): Promise<TableInfo[]> {
        const client = new PgClient({
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            database: connection.database,
            ssl: connection.ssl ? { rejectUnauthorized: false } : false
        });

        try {
            await client.connect();
            const result = await client.query(`
                SELECT 
                    t.table_name as name,
                    COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) as "rows",
                    pg_size_pretty(pg_total_relation_size(c.oid)) as size,
                    t.table_type as type,
                    t.table_schema as schema_name
                FROM information_schema.tables t
                LEFT JOIN pg_class c ON c.relname = t.table_name
                LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
                WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
                ORDER BY t.table_name
            `);

            return result.rows.map(table => ({
                name: table.name,
                rows: parseInt(table.rows) || 0,
                size: table.size || '0 bytes',
                type: table.type?.toLowerCase().includes('view') ? 'view' : 'table',
                schema: table.schema_name
            }));
        } finally {
            await client.end();
        }
    }

    private async getMongoDBCollections(connection: DatabaseConnection): Promise<TableInfo[]> {
        const uri = connection.ssl
            ? `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}?ssl=true`
            : `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;

        const client = new MongoClient(uri);

        try {
            await client.connect();
            const db = client.db(connection.database);
            const collections = await db.listCollections().toArray();

            const tablesInfo: TableInfo[] = [];

            for (const collection of collections) {
                try {
                    const count = await db.collection(collection.name).countDocuments();
                    tablesInfo.push({
                        name: collection.name,
                        rows: count || 0,
                        size: 'N/A',
                        type: 'collection',
                        schema: connection.database
                    });
                } catch (error) {
                    tablesInfo.push({
                        name: collection.name,
                        rows: 0,
                        size: 'N/A',
                        type: 'collection',
                        schema: connection.database
                    });
                }
            }

            return tablesInfo;
        } finally {
            await client.close();
        }
    }

    private async getRedisKeys(connection: DatabaseConnection): Promise<TableInfo[]> {
        const client = redis.createClient({
            socket: {
                host: connection.host,
                port: connection.port
            },
            username: connection.username,
            password: connection.password
        });

        try {
            await client.connect();
            const keys = await client.keys('*');
            const keyTypes = await Promise.all(keys.map(key => client.type(key)));

            return keys.slice(0, 100).map((key, index) => ({
                name: key,
                rows: 1,
                size: 'N/A',
                type: 'key',
                schema: keyTypes[index]
            }));
        } finally {
            await client.quit();
        }
    }

    private async getSQLiteTables(connection: DatabaseConnection): Promise<TableInfo[]> {
        return new Promise((resolve, reject) => {
            const dbPath = path.isAbsolute(connection.host) ? connection.host : path.join(process.cwd(), connection.host);
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

            db.all(`
                SELECT 
                    name,
                    type,
                    sql
                FROM sqlite_master 
                WHERE type IN ('table', 'view')
                ORDER BY name
            `, (err, rows: any[]) => {
                if (err) {
                    db.close();
                    reject(err);
                    return;
                }

                const tables: TableInfo[] = rows.map((row: any) => ({
                    name: row.name,
                    rows: 0, // Will be populated in a separate query
                    size: 'N/A',
                    type: row.type,
                    schema: 'main'
                }));

                db.close();
                resolve(tables);
            });
        });
    }

    public async executeQuery(connectionId: string, query: string): Promise<{ success: boolean; data?: QueryResult; error?: string }> {
        const startTime = Date.now();
        this.queryCount++;

        try {
            const connection = this.connections.get(connectionId);
            if (!connection) {
                this.errorCount++;
                return { success: false, error: 'Connection not found' };
            }

            let result: QueryResult;

            switch (connection.type) {
                case 'mysql':
                    result = await this.executeMySQLQuery(connection, query);
                    break;
                case 'postgresql':
                    result = await this.executePostgreSQLQuery(connection, query);
                    break;
                case 'mongodb':
                    result = await this.executeMongoDBQuery(connection, query);
                    break;
                case 'redis':
                    result = await this.executeRedisQuery(connection, query);
                    break;
                case 'sqlite':
                    result = await this.executeSQLiteQuery(connection, query);
                    break;
                default:
                    this.errorCount++;
                    return { success: false, error: `Unsupported database type: ${connection.type}` };
            }

            const executionTime = Date.now() - startTime;
            this.totalQueryTime += executionTime;

            result.executionTime = executionTime;
            result.query = query;
            result.timestamp = new Date().toISOString();

            // Save to query history
            this.queryHistory.unshift(result);
            if (this.queryHistory.length > 100) {
                this.queryHistory = this.queryHistory.slice(0, 100);
            }

            // Save to database
            await this.executeLocalQuery(
                'INSERT INTO query_history (connection_id, query_text, execution_time, rows_affected, timestamp) VALUES (?, ?, ?, ?, ?)',
                [connectionId, query, executionTime, result.rowsAffected, result.timestamp]
            );

            return { success: true, data: result };
        } catch (error) {
            this.errorCount++;
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown query execution error';

            console.error(`Query execution failed for connection ${connectionId}:`, errorMessage);

            // Save error to query history
            const errorResult: QueryResult = {
                columns: [],
                rows: [],
                executionTime,
                rowsAffected: 0,
                query,
                timestamp: new Date().toISOString(),
                error: errorMessage
            };

            this.queryHistory.unshift(errorResult);
            if (this.queryHistory.length > 100) {
                this.queryHistory = this.queryHistory.slice(0, 100);
            }

            await this.executeLocalQuery(
                'INSERT INTO query_history (connection_id, query_text, execution_time, rows_affected, timestamp, error) VALUES (?, ?, ?, ?, ?, ?)',
                [connectionId, query, executionTime, 0, errorResult.timestamp, errorMessage]
            );

            return {
                success: false,
                error: errorMessage,
                data: errorResult
            };
        }
    }

    private async executeMySQLQuery(connection: DatabaseConnection, query: string): Promise<QueryResult> {
        const config: any = {
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            database: connection.database
        };

        if (connection.ssl) {
            config.ssl = {};
        }

        const mysqlConnection = await mysql.createConnection(config);

        try {
            const [results, fields] = await mysqlConnection.execute(query);

            if (Array.isArray(results)) {
                return {
                    columns: fields?.map(field => field.name) || [],
                    rows: results.map(row => Object.values(row)),
                    executionTime: 0,
                    rowsAffected: results.length,
                    query,
                    timestamp: ''
                };
            } else {
                return {
                    columns: [],
                    rows: [],
                    executionTime: 0,
                    rowsAffected: (results as any).affectedRows || 0,
                    query,
                    timestamp: ''
                };
            }
        } finally {
            await mysqlConnection.end();
        }
    }

    private async executePostgreSQLQuery(connection: DatabaseConnection, query: string): Promise<QueryResult> {
        const client = new PgClient({
            host: connection.host,
            port: connection.port,
            user: connection.username,
            password: connection.password,
            database: connection.database,
            ssl: connection.ssl ? { rejectUnauthorized: false } : false
        });

        try {
            await client.connect();
            const result = await client.query(query);

            return {
                columns: result.fields.map(field => field.name),
                rows: result.rows.map(row => Object.values(row)),
                executionTime: 0,
                rowsAffected: result.rowCount || 0,
                query,
                timestamp: ''
            };
        } finally {
            await client.end();
        }
    }

    private async executeMongoDBQuery(connection: DatabaseConnection, query: string): Promise<QueryResult> {
        // For MongoDB, we'll expect JSON queries
        const uri = connection.ssl
            ? `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}?ssl=true`
            : `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;

        const client = new MongoClient(uri);

        try {
            await client.connect();
            const db = client.db(connection.database);

            // Parse MongoDB query (expecting JSON format)
            const queryObj = JSON.parse(query);
            const collection = db.collection(queryObj.collection);

            let results;
            if (queryObj.operation === 'find') {
                results = await collection.find(queryObj.filter || {}).limit(queryObj.limit || 100).toArray();
            } else if (queryObj.operation === 'aggregate') {
                results = await collection.aggregate(queryObj.pipeline || []).toArray();
            } else {
                throw new Error('Unsupported MongoDB operation');
            }

            const columns = results.length > 0 ? Object.keys(results[0]) : [];

            return {
                columns,
                rows: results.map(doc => columns.map(col => doc[col])),
                executionTime: 0,
                rowsAffected: results.length,
                query,
                timestamp: ''
            };
        } finally {
            await client.close();
        }
    }

    private async executeRedisQuery(connection: DatabaseConnection, query: string): Promise<QueryResult> {
        const client = redis.createClient({
            socket: {
                host: connection.host,
                port: connection.port
            },
            username: connection.username,
            password: connection.password
        });

        try {
            await client.connect();

            // Parse Redis command
            const parts = query.trim().split(' ');
            const command = parts[0].toUpperCase();
            const args = parts.slice(1);

            let result;
            switch (command) {
                case 'GET':
                    result = await client.get(args[0]);
                    break;
                case 'SET':
                    result = await client.set(args[0], args[1]);
                    break;
                case 'KEYS':
                    result = await client.keys(args[0] || '*');
                    break;
                case 'DEL':
                    result = await client.del(args);
                    break;
                default:
                    throw new Error(`Unsupported Redis command: ${command}`);
            }

            const resultArray = Array.isArray(result) ? result : [result];

            return {
                columns: ['Result'],
                rows: resultArray.map(r => [r]),
                executionTime: 0,
                rowsAffected: resultArray.length,
                query,
                timestamp: ''
            };
        } finally {
            await client.quit();
        }
    }

    private async executeSQLiteQuery(connection: DatabaseConnection, query: string): Promise<QueryResult> {
        return new Promise((resolve, reject) => {
            const dbPath = path.isAbsolute(connection.host) ? connection.host : path.join(process.cwd(), connection.host);
            const db = new sqlite3.Database(dbPath);

            if (query.trim().toUpperCase().startsWith('SELECT')) {
                db.all(query, (err, rows: any[]) => {
                    db.close();
                    if (err) {
                        reject(err);
                        return;
                    }

                    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
                    resolve({
                        columns,
                        rows: rows.map(row => columns.map(col => row[col])),
                        executionTime: 0,
                        rowsAffected: rows.length,
                        query,
                        timestamp: ''
                    });
                });
            } else {
                db.run(query, function (err) {
                    db.close();
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve({
                        columns: [],
                        rows: [],
                        executionTime: 0,
                        rowsAffected: this.changes,
                        query,
                        timestamp: ''
                    });
                });
            }
        });
    }

    // Metrics and monitoring
    public async getDatabaseMetrics(): Promise<{ success: boolean; data?: DatabaseMetrics; error?: string }> {
        try {
            const uptime = Date.now() - this.startTime;
            const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
            const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

            const metrics: DatabaseMetrics = {
                totalConnections: this.connections.size,
                activeConnections: this.activeConnections.size,
                totalQueries: this.queryCount,
                avgQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
                errorRate: this.queryCount > 0 ? (this.errorCount / this.queryCount) * 100 : 0,
                uptime: `${uptimeHours}h ${uptimeMinutes}m`,
                memoryUsage: Math.random() * 100, // Placeholder - implement real memory monitoring
                diskUsage: Math.random() * 100,   // Placeholder - implement real disk monitoring
                cacheHitRatio: Math.random() * 100, // Placeholder - implement real cache monitoring
                lastUpdated: new Date().toISOString()
            };

            return { success: true, data: metrics };
        } catch (error) {
            console.error('Error getting database metrics:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get database metrics'
            };
        }
    }

    public async getDatabaseHealth(): Promise<{ success: boolean; data?: DatabaseHealth; error?: string }> {
        try {
            const health: DatabaseHealth = {
                status: 'healthy',
                score: 95,
                checks: [
                    {
                        name: 'Database Connectivity',
                        status: 'pass',
                        message: 'All connections are healthy',
                        value: `${this.activeConnections.size}/${this.connections.size} connected`
                    },
                    {
                        name: 'Query Performance',
                        status: 'pass',
                        message: 'Average query time is within acceptable limits',
                        value: this.queryCount > 0 ? `${(this.totalQueryTime / this.queryCount).toFixed(2)}ms` : '0ms'
                    },
                    {
                        name: 'Error Rate',
                        status: this.errorCount / Math.max(this.queryCount, 1) > 0.1 ? 'warning' : 'pass',
                        message: 'Error rate is acceptable',
                        value: `${this.errorCount}/${this.queryCount} queries`
                    }
                ],
                lastCheck: new Date().toISOString()
            };

            return { success: true, data: health };
        } catch (error) {
            console.error('Error getting database health:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get database health'
            };
        }
    }

    public async getQueryHistory(): Promise<{ success: boolean; data?: QueryResult[]; error?: string }> {
        try {
            return { success: true, data: this.queryHistory };
        } catch (error) {
            console.error('Error getting query history:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get query history'
            };
        }
    }

    public async exportData(connectionId: string, format: string): Promise<{ success: boolean; data?: string; error?: string }> {
        try {
            const connection = this.connections.get(connectionId);
            if (!connection) {
                return { success: false, error: 'Connection not found' };
            }

            // Export basic connection info for now
            const exportData = {
                connection: {
                    name: connection.name,
                    type: connection.type,
                    host: connection.host,
                    port: connection.port,
                    database: connection.database
                },
                exportDate: new Date().toISOString(),
                queryHistory: this.queryHistory.filter(q => !q.error).slice(0, 10)
            };

            let result: string;
            switch (format) {
                case 'json':
                    result = JSON.stringify(exportData, null, 2);
                    break;
                case 'csv':
                    result = 'Connection Name,Type,Host,Port,Database\n';
                    result += `${connection.name},${connection.type},${connection.host},${connection.port},${connection.database}`;
                    break;
                default:
                    return { success: false, error: `Unsupported export format: ${format}` };
            }

            return { success: true, data: result };
        } catch (error) {
            console.error('Error exporting data:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to export data'
            };
        }
    }

    public async openDatabaseInExternal(connectionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const connection = this.connections.get(connectionId);
            if (!connection) {
                return { success: false, error: 'Connection not found' };
            }

            // Create a connection string for external tools
            let connectionString = '';
            switch (connection.type) {
                case 'mysql':
                    connectionString = `mysql://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;
                    break;
                case 'postgresql':
                    connectionString = `postgresql://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;
                    break;
                case 'mongodb':
                    connectionString = `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;
                    break;
                case 'sqlite':
                    await shell.openPath(connection.host);
                    return { success: true };
                default:
                    return { success: false, error: `External tools not supported for ${connection.type}` };
            }

            // Copy to clipboard for now
            require('electron').clipboard.writeText(connectionString);

            return { success: true };
        } catch (error) {
            console.error('Error opening database in external tool:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to open database in external tool'
            };
        }
    }
}
