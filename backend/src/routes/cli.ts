import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/database';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Get all CLI commands
router.get('/commands', asyncHandler(async (req: Request, res: Response) => {
  const { category, search } = req.query;
  const db = getDatabase();
  
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
  
  const params: any[] = [];
  const conditions: string[] = [];
  
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
  
  const formattedCommands = commands.map((cmd: any) => ({
    ...cmd,
    parameters: cmd.parameters ? JSON.parse(cmd.parameters) : {},
    tags: cmd.tags ? JSON.parse(cmd.tags) : []
  }));

  res.json({
    status: 'success',
    data: formattedCommands
  });
}));

// Get CLI commands grouped by category
router.get('/commands/grouped', asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase();
  
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
  
  // Group commands by category
  const groupedCommands: { [key: string]: any[] } = {};
  
  commands.forEach((cmd: any) => {
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

// Get CLI command categories
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase();
  
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

// Get a specific CLI command by ID
router.get('/commands/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  
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

// Power Platform CLI Quick Reference
router.get('/quick-reference', asyncHandler(async (req: Request, res: Response) => {
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

// Power Platform CLI Best Practices
router.get('/best-practices', asyncHandler(async (req: Request, res: Response) => {
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

export default router;
