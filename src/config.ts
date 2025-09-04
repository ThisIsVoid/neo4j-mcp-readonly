import { z } from "zod";

const ConfigSchema = z.object({
  neo4j: z.object({
    uri: z.string().url().default("bolt://localhost:7687"),
    username: z.string().default("neo4j"),
    password: z.string().min(1, "Password is required"),
  }),
});

// Get configuration from environment variables or command line args
export function getConfig() {
  // Check for command line arguments
  const args = process.argv.slice(2);
  const cliConfig: any = {};

  for (let i = 0; i < args.length; i += 2) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case "--neo4j-uri":
        if (!value) {
          console.error("Error: --neo4j-uri requires a value");
          process.exit(1);
        }
        cliConfig.NEO4J_URI = value;
        break;
      case "--neo4j-username":
        if (!value) {
          console.error("Error: --neo4j-username requires a value");
          process.exit(1);
        }
        cliConfig.NEO4J_USERNAME = value;
        break;
      case "--neo4j-password":
        if (!value) {
          console.error("Error: --neo4j-password requires a value");
          process.exit(1);
        }
        cliConfig.NEO4J_PASSWORD = value;
        break;
      case "--help":
        console.log(`
Neo4j MCP Server

Usage: neo4j-mcp-readonly [options]

Options:
  --neo4j-uri       Neo4j connection URI (default: bolt://localhost:7687)
  --neo4j-username  Neo4j username (default: neo4j)
  --neo4j-password  Neo4j password (required)
  --help           Show this help message

Environment Variables:
  NEO4J_URI         Neo4j connection URI
  NEO4J_USERNAME    Neo4j username
  NEO4J_PASSWORD    Neo4j password

Example:
  neo4j-mcp-readonly --neo4j-uri bolt://localhost:7687 --neo4j-username neo4j --neo4j-password mypassword

Or use environment variables:
  NEO4J_URI=bolt://localhost:7687 NEO4J_USERNAME=neo4j NEO4J_PASSWORD=mypassword neo4j-mcp-readonly
        `);
        process.exit(0);
    }
  }

  // Merge CLI args with environment variables (CLI takes precedence)
  const env = { ...process.env, ...cliConfig };

  try {
    return ConfigSchema.parse({
      neo4j: {
        uri: env.NEO4J_URI || "bolt://localhost:7687",
        username: env.NEO4J_USERNAME || "neo4j",
        password: env.NEO4J_PASSWORD,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Configuration error:");
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      console.error("\nUse --help for usage information");
      process.exit(1);
    }
    throw error;
  }
}

export const config = getConfig();
