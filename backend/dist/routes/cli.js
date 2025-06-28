"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database/database");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.get('/commands', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { category, search } = req.query;
    const db = (0, database_1.getDatabase)();
    let query = `
    SELECT 
      id,
      name,
      category,
      description,
      command,
      parameters,
      example_usage,
      documentation_link,
      tags
    FROM cli_commands
  `;
    const params = [];
    const conditions = [];
    if (category) {
        conditions.push('category = ?');
        params.push(category);
    }
    if (search) {
        conditions.push('(name LIKE ? OR description LIKE ? OR command LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY category, name';
    const commands = await db.all(query, params);
    const formattedCommands = commands.map((cmd) => ({
        ...cmd,
        parameters: cmd.parameters ? JSON.parse(cmd.parameters) : {},
        tags: cmd.tags ? JSON.parse(cmd.tags) : []
    }));
    res.json({
        status: 'success',
        data: formattedCommands
    });
}));
router.get('/commands/grouped', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDatabase)();
    const commands = await db.all(`
    SELECT 
      id,
      name,
      category,
      description,
      command,
      parameters,
      example_usage,
      documentation_link,
      tags
    FROM cli_commands
    ORDER BY category, name
  `);
    const groupedCommands = {};
    commands.forEach((cmd) => {
        const category = cmd.category;
        if (!groupedCommands[category]) {
            groupedCommands[category] = [];
        }
        groupedCommands[category].push({
            ...cmd,
            parameters: cmd.parameters ? JSON.parse(cmd.parameters) : {},
            tags: cmd.tags ? JSON.parse(cmd.tags) : []
        });
    });
    res.json({
        status: 'success',
        data: groupedCommands
    });
}));
router.get('/categories', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const db = (0, database_1.getDatabase)();
    const categories = await db.all(`
    SELECT 
      category,
      COUNT(*) as command_count,
      GROUP_CONCAT(DISTINCT name) as sample_commands
    FROM cli_commands
    GROUP BY category
    ORDER BY category
  `);
    res.json({
        status: 'success',
        data: categories
    });
}));
router.get('/commands/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    const command = await db.get(`
    SELECT 
      id,
      name,
      category,
      description,
      command,
      parameters,
      example_usage,
      documentation_link,
      tags
    FROM cli_commands
    WHERE id = ?
  `, [id]);
    if (!command) {
        res.status(404).json({
            status: 'fail',
            message: 'CLI command not found'
        });
        return;
    }
    const formattedCommand = {
        ...command,
        parameters: command.parameters ? JSON.parse(command.parameters) : {},
        tags: command.tags ? JSON.parse(command.tags) : []
    };
    res.json({
        status: 'success',
        data: formattedCommand
    });
}));
router.get('/quick-reference', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const quickReference = {
        installation: {
            title: "Installing Power Platform CLI",
            methods: [
                {
                    name: "Windows (MSI Installer)",
                    command: "Download from https://aka.ms/PowerPlatformCLI",
                    description: "Recommended for Windows users"
                },
                {
                    name: "NPM",
                    command: "npm install -g @microsoft/powerplatform-cli",
                    description: "Cross-platform installation via Node.js"
                },
                {
                    name: "Visual Studio Code Extension",
                    command: "Install 'Power Platform Tools' extension",
                    description: "Integrated CLI experience in VS Code"
                }
            ]
        },
        authentication: {
            title: "Authentication Commands",
            commands: [
                {
                    command: "pac auth create",
                    description: "Authenticate to your Power Platform environment",
                    example: "pac auth create --name MyTenant --url https://yourtenant.crm.dynamics.com"
                },
                {
                    command: "pac auth list",
                    description: "List all authenticated profiles",
                    example: "pac auth list"
                },
                {
                    command: "pac auth select",
                    description: "Select an authentication profile",
                    example: "pac auth select --name MyTenant"
                }
            ]
        },
        commonWorkflows: {
            title: "Common Administrative Workflows",
            workflows: [
                {
                    name: "Environment Audit",
                    description: "Complete audit of an environment",
                    steps: [
                        "pac environment list",
                        "pac environment show --environment-id {env-id}",
                        "pac user list --environment-id {env-id}",
                        "pac solution list --environment-id {env-id}",
                        "pac connector list --environment-id {env-id}"
                    ]
                },
                {
                    name: "Security Review",
                    description: "Review security settings and policies",
                    steps: [
                        "pac admin list",
                        "pac user list --environment-id {env-id}",
                        "pac security list"
                    ]
                },
                {
                    name: "Compliance Check",
                    description: "Basic compliance verification",
                    steps: [
                        "pac environment list",
                        "pac connector list",
                        "pac analytics list"
                    ]
                }
            ]
        },
        troubleshooting: {
            title: "Troubleshooting",
            tips: [
                {
                    issue: "Authentication Failed",
                    solution: "Run 'pac auth clear' and re-authenticate with 'pac auth create'"
                },
                {
                    issue: "Permission Denied",
                    solution: "Ensure you have the required admin roles in your tenant"
                },
                {
                    issue: "Environment Not Found",
                    solution: "Verify environment ID with 'pac environment list'"
                },
                {
                    issue: "Command Not Recognized",
                    solution: "Update CLI with 'npm update -g @microsoft/powerplatform-cli'"
                }
            ]
        }
    };
    res.json({
        status: 'success',
        data: quickReference
    });
}));
router.get('/best-practices', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const bestPractices = {
        security: [
            "Always use service principal authentication for automated scripts",
            "Regularly rotate authentication credentials",
            "Use least-privilege access for CLI operations",
            "Never store credentials in scripts or version control",
            "Use Azure Key Vault for storing sensitive information"
        ],
        automation: [
            "Use JSON output format for scripting: --output json",
            "Implement proper error handling in scripts",
            "Use environment variables for configuration",
            "Log all CLI operations for audit trails",
            "Test scripts in development environments first"
        ],
        monitoring: [
            "Schedule regular environment audits",
            "Monitor DLP policy compliance",
            "Track solution deployment activities",
            "Review user access patterns",
            "Generate compliance reports regularly"
        ],
        governance: [
            "Document all CLI procedures",
            "Maintain consistent naming conventions",
            "Use version control for scripts",
            "Implement approval processes for production changes",
            "Regular training for administrative staff"
        ]
    };
    res.json({
        status: 'success',
        data: bestPractices
    });
}));
exports.default = router;
//# sourceMappingURL=cli.js.map