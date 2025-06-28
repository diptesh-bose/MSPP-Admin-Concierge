"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const logger_1 = require("../utils/logger");
let db = null;
async function initializeDatabase() {
    try {
        const dbPath = process.env.DATABASE_URL || './data/compliance.db';
        const dbDir = path_1.default.dirname(dbPath);
        try {
            await promises_1.default.access(dbDir);
        }
        catch {
            await promises_1.default.mkdir(dbDir, { recursive: true });
            logger_1.logger.info(`Created database directory: ${dbDir}`);
        }
        db = await (0, sqlite_1.open)({
            filename: dbPath,
            driver: sqlite3_1.default.Database,
        });
        await db.exec('PRAGMA foreign_keys = ON');
        await createTables();
        await runMigrations();
        await insertDefaultData();
        await runMigrations();
        logger_1.logger.info('Database initialized successfully');
        return db;
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize database:', error);
        throw error;
    }
}
async function createTables() {
    if (!db)
        throw new Error('Database not initialized');
    const createTablesSQL = `
    -- Power Platform environments
    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY, -- Power Platform environment ID
      name TEXT NOT NULL,
      display_name TEXT,
      type TEXT CHECK(type IN ('Production', 'Sandbox', 'Trial', 'Default', 'PoC', 'Developer')) DEFAULT 'Sandbox',
      region TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Compliance categories
    CREATE TABLE IF NOT EXISTS compliance_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Compliance checklist items
    CREATE TABLE IF NOT EXISTS compliance_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      environment_id TEXT, -- Can be NULL for global/tenant-level items
      title TEXT NOT NULL,
      description TEXT,
      importance TEXT CHECK(importance IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
      documentation_link TEXT,
      cli_commands TEXT, -- JSON array of CLI commands
      is_completed BOOLEAN DEFAULT FALSE,
      completed_at DATETIME,
      completed_by TEXT,
      notes TEXT,
      completion_details TEXT, -- JSON object with completion details
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES compliance_categories (id) ON DELETE CASCADE,
      FOREIGN KEY (environment_id) REFERENCES environments (id) ON DELETE CASCADE
    );

    -- CLI command documentation
    CREATE TABLE IF NOT EXISTS cli_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      command TEXT NOT NULL,
      parameters TEXT, -- JSON object describing parameters
      example_usage TEXT,
      documentation_link TEXT,
      tags TEXT, -- JSON array of tags
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      environment_id TEXT, -- Track which environment the action relates to
      user_id TEXT,
      details TEXT, -- JSON object with additional details
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (environment_id) REFERENCES environments (id) ON DELETE SET NULL
    );

    -- Dashboard metrics (for caching)
    CREATE TABLE IF NOT EXISTS dashboard_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name TEXT NOT NULL UNIQUE,
      metric_value TEXT NOT NULL, -- JSON value
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User sessions (simple session management)
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_compliance_items_category ON compliance_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_compliance_items_environment ON compliance_items(environment_id);
    CREATE INDEX IF NOT EXISTS idx_compliance_items_completed ON compliance_items(is_completed);
    CREATE INDEX IF NOT EXISTS idx_cli_commands_category ON cli_commands(category);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_environment ON audit_logs(environment_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
  `;
    await db.exec(createTablesSQL);
    logger_1.logger.info('Database tables created successfully');
}
async function insertDefaultData() {
    if (!db)
        throw new Error('Database not initialized');
    const existingCategories = await db.get('SELECT COUNT(*) as count FROM compliance_categories');
    if (existingCategories.count > 0) {
        logger_1.logger.info('Default data already exists, skipping insertion');
        return;
    }
    const categories = [
        {
            name: 'Data Protection & Privacy',
            description: 'Ensure data protection and privacy compliance across your Power Platform environment',
            icon: '🔒',
            order_index: 1
        },
        {
            name: 'Identity & Access Management',
            description: 'Manage user access, authentication, and authorization properly',
            icon: '👤',
            order_index: 2
        },
        {
            name: 'Compliance & Governance',
            description: 'Maintain regulatory compliance and governance standards',
            icon: '📋',
            order_index: 3
        },
        {
            name: 'Monitoring & Observability',
            description: 'Monitor tenant health and maintain visibility into platform usage',
            icon: '📊',
            order_index: 4
        },
        {
            name: 'Environment Management',
            description: 'Properly manage environments and their lifecycle',
            icon: '🌍',
            order_index: 5
        }
    ];
    for (const category of categories) {
        await db.run('INSERT INTO compliance_categories (name, description, icon, order_index) VALUES (?, ?, ?, ?)', [category.name, category.description, category.icon, category.order_index]);
    }
    await insertDefaultEnvironments();
    await insertDefaultComplianceItems();
    await insertDefaultCLICommands();
    logger_1.logger.info('Default data inserted successfully');
}
async function insertDefaultEnvironments() {
    if (!db)
        throw new Error('Database not initialized');
    const defaultEnvironments = [
        {
            id: 'default-00000000-0000-0000-0000-000000000001',
            name: 'Default Environment',
            display_name: 'Default Environment (Sample)',
            type: 'Default',
            region: 'United States',
            created_by: 'System'
        },
        {
            id: 'prod-00000000-0000-0000-0000-000000000002',
            name: 'Production',
            display_name: 'Production Environment',
            type: 'Production',
            region: 'United States',
            created_by: 'Admin'
        },
        {
            id: 'dev-00000000-0000-0000-0000-000000000003',
            name: 'Development',
            display_name: 'Development Environment',
            type: 'Sandbox',
            region: 'United States',
            created_by: 'Admin'
        },
        {
            id: 'test-00000000-0000-0000-0000-000000000004',
            name: 'Testing',
            display_name: 'Testing Environment',
            type: 'Sandbox',
            region: 'United States',
            created_by: 'Admin'
        }
    ];
    for (const env of defaultEnvironments) {
        await db.run('INSERT INTO environments (id, name, display_name, type, region, created_by) VALUES (?, ?, ?, ?, ?, ?)', [env.id, env.name, env.display_name, env.type, env.region, env.created_by]);
    }
    logger_1.logger.info('Default environments inserted successfully');
}
async function insertDefaultComplianceItems() {
    if (!db)
        throw new Error('Database not initialized');
    const complianceItems = [
        {
            category: 'Data Protection & Privacy',
            title: 'Create and Review DLP Policies',
            description: 'Create DLP policies to control data flow between connectors and environments. Regularly review and update DLP policies to align with security requirements.',
            importance: 'critical',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/wp-data-loss-prevention',
            cli_commands: JSON.stringify([
                'pac admin list',
                'pac connector list'
            ]),
            order_index: 1
        },
        {
            category: 'Data Protection & Privacy',
            title: 'Configure Customer-Managed Keys',
            description: 'Consider using customer-managed keys for additional control over encryption.',
            importance: 'high',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/customer-managed-key',
            cli_commands: JSON.stringify([
                'pac environment list'
            ]),
            order_index: 2
        },
        {
            category: 'Data Protection & Privacy',
            title: 'Implement Privacy by Design',
            description: 'Incorporate privacy considerations into the design and development of applications. Ensure privacy is a fundamental aspect of your development process.',
            importance: 'high',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/privacy-dsr-guide',
            cli_commands: JSON.stringify([]),
            order_index: 3
        },
        {
            category: 'Identity & Access Management',
            title: 'Review Identity Management Strategy',
            description: 'Create an identity management strategy that covers user access, service accounts, application users, federation requirements for single sign-on, and conditional access policies.',
            importance: 'critical',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/create-users-assign-online-security-roles',
            cli_commands: JSON.stringify([
                'pac org list',
                'pac user list'
            ]),
            order_index: 1
        },
        {
            category: 'Identity & Access Management',
            title: 'Configure Administrative Access Policies',
            description: 'Create administrative access policies for different admin roles on the platform, such as service admin and Microsoft 365 admin.',
            importance: 'critical',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/use-service-admin-role-manage-tenant',
            cli_commands: JSON.stringify([
                'pac admin list',
                'pac user list --environment-id {environment-id}'
            ]),
            order_index: 2
        },
        {
            category: 'Compliance & Governance',
            title: 'Identify Regulatory Standards',
            description: 'Determine which regulatory standards apply to your organization (for example, GDPR, HIPAA, CCPA, PCI Data Security Standard). Understand the specific requirements and obligations of each regulation.',
            importance: 'critical',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/governance-considerations',
            cli_commands: JSON.stringify([]),
            order_index: 1
        },
        {
            category: 'Compliance & Governance',
            title: 'Enable Activity Monitoring',
            description: 'Use the Power Platform admin center and Microsoft Sentinel to track user activities. Conduct regular audits to detect anomalies and ensure compliance with regulatory standards.',
            importance: 'high',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/logging-powerapps',
            cli_commands: JSON.stringify([
                'pac activity list',
                'pac admin list'
            ]),
            order_index: 2
        },
        {
            category: 'Monitoring & Observability',
            title: 'Monitor Tenant Analytics',
            description: 'Use tenant-level analytics to understand platform usage and identify trends.',
            importance: 'medium',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/tenant-level-analytics',
            cli_commands: JSON.stringify([
                'pac admin list',
                'pac analytics list'
            ]),
            order_index: 1
        },
        {
            category: 'Monitoring & Observability',
            title: 'Review Security Score',
            description: 'Regularly assess and monitor your security score and understand how to improve your security policies.',
            importance: 'high',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/security/security-overview',
            cli_commands: JSON.stringify([
                'pac admin list',
                'pac security list'
            ]),
            order_index: 2
        },
        {
            category: 'Environment Management',
            title: 'Review Environment Strategy',
            description: 'Develop and maintain a proper environment strategy for development, testing, and production workloads.',
            importance: 'high',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/environments-overview',
            cli_commands: JSON.stringify([
                'pac environment list',
                'pac environment show --environment-id {environment-id}'
            ]),
            order_index: 1
        },
        {
            category: 'Environment Management',
            title: 'Monitor Environment Health',
            description: 'Regularly monitor environment health and performance metrics.',
            importance: 'medium',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/admin/monitoring/monitoring-overview',
            cli_commands: JSON.stringify([
                'pac environment list',
                'pac solution list --environment-id {environment-id}'
            ]),
            order_index: 2
        }
    ];
    for (const item of complianceItems) {
        const category = await db.get('SELECT id FROM compliance_categories WHERE name = ?', [item.category]);
        if (!category)
            continue;
        await db.run(`
      INSERT INTO compliance_items 
      (category_id, title, description, importance, documentation_link, cli_commands, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            category.id,
            item.title,
            item.description,
            item.importance,
            item.documentation_link,
            item.cli_commands,
            item.order_index
        ]);
    }
}
async function insertDefaultCLICommands() {
    if (!db)
        throw new Error('Database not initialized');
    const cliCommands = [
        {
            name: 'List Environments',
            category: 'Environment Management',
            description: 'Lists all environments in your tenant',
            command: 'pac environment list',
            parameters: JSON.stringify({
                optional: [
                    { name: '--environment-id', description: 'Filter by specific environment ID' },
                    { name: '--output', description: 'Output format (json, table)' }
                ]
            }),
            example_usage: 'pac environment list --output json',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/environment',
            tags: JSON.stringify(['environment', 'list', 'tenant'])
        },
        {
            name: 'List Connectors',
            category: 'Data Protection',
            description: 'Lists all available connectors in your tenant',
            command: 'pac connector list',
            parameters: JSON.stringify({
                optional: [
                    { name: '--environment-id', description: 'Specific environment to query' },
                    { name: '--filter', description: 'Filter connectors by name or category' }
                ]
            }),
            example_usage: 'pac connector list --environment-id 12345678-1234-1234-1234-123456789012',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/connector',
            tags: JSON.stringify(['connector', 'dlp', 'security'])
        },
        {
            name: 'Show Environment Details',
            category: 'Environment Management',
            description: 'Shows detailed information about a specific environment',
            command: 'pac environment show',
            parameters: JSON.stringify({
                required: [
                    { name: '--environment-id', description: 'The ID of the environment to show' }
                ]
            }),
            example_usage: 'pac environment show --environment-id 12345678-1234-1234-1234-123456789012',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/environment',
            tags: JSON.stringify(['environment', 'details', 'info'])
        },
        {
            name: 'List Solutions',
            category: 'Solution Management',
            description: 'Lists solutions in an environment',
            command: 'pac solution list',
            parameters: JSON.stringify({
                required: [
                    { name: '--environment-id', description: 'Environment ID to query solutions from' }
                ]
            }),
            example_usage: 'pac solution list --environment-id 12345678-1234-1234-1234-123456789012',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/solution',
            tags: JSON.stringify(['solution', 'environment', 'management'])
        },
        {
            name: 'List Users',
            category: 'Identity Management',
            description: 'Lists users in an environment with their security roles',
            command: 'pac user list',
            parameters: JSON.stringify({
                required: [
                    { name: '--environment-id', description: 'Environment ID to query users from' }
                ]
            }),
            example_usage: 'pac user list --environment-id 12345678-1234-1234-1234-123456789012',
            documentation_link: 'https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/user',
            tags: JSON.stringify(['user', 'security', 'roles'])
        }
    ];
    for (const cmd of cliCommands) {
        await db.run(`
      INSERT INTO cli_commands 
      (name, category, description, command, parameters, example_usage, documentation_link, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            cmd.name,
            cmd.category,
            cmd.description,
            cmd.command,
            cmd.parameters,
            cmd.example_usage,
            cmd.documentation_link,
            cmd.tags
        ]);
    }
}
async function runMigrations() {
    if (!db)
        throw new Error('Database not initialized');
    try {
        const tableInfo = await db.all("PRAGMA table_info(compliance_items)");
        const hasCompletionDetails = tableInfo.some(column => column.name === 'completion_details');
        if (!hasCompletionDetails) {
            await db.exec('ALTER TABLE compliance_items ADD COLUMN completion_details TEXT');
            logger_1.logger.info('Added completion_details column to compliance_items table');
        }
        const hasEnvironmentId = tableInfo.some(column => column.name === 'environment_id');
        if (!hasEnvironmentId) {
            await db.exec('ALTER TABLE compliance_items ADD COLUMN environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE');
            logger_1.logger.info('Added environment_id column to compliance_items table');
        }
        const auditTableInfo = await db.all("PRAGMA table_info(audit_logs)");
        const auditHasEnvironmentId = auditTableInfo.some(column => column.name === 'environment_id');
        if (!auditHasEnvironmentId) {
            await db.exec('ALTER TABLE audit_logs ADD COLUMN environment_id TEXT REFERENCES environments(id) ON DELETE SET NULL');
            logger_1.logger.info('Added environment_id column to audit_logs table');
        }
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='environments'");
        if (tables.length === 0) {
            await db.exec(`
        CREATE TABLE environments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          display_name TEXT,
          type TEXT CHECK(type IN ('Production', 'Sandbox', 'Trial', 'Default', 'PoC', 'Developer')) DEFAULT 'Sandbox',
          region TEXT,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
            await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_compliance_items_environment ON compliance_items(environment_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_environment ON audit_logs(environment_id);
      `);
            logger_1.logger.info('Created environments table and indexes');
        }
    }
    catch (error) {
        logger_1.logger.error('Migration failed:', error);
    }
}
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}
async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
        logger_1.logger.info('Database connection closed');
    }
}
//# sourceMappingURL=database.js.map