# Neo4j MCP Server

[![npm version](https://badge.fury.io/js/neo4j-mcp-readonly.svg)](https://badge.fury.io/js/neo4j-mcp-readonly)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A Model Context Protocol (MCP) server that provides **read-only** access to your Neo4j database. This server allows you to connect Cursor IDE to your Neo4j database and run safe, read-only Cypher queries with comprehensive database exploration tools.

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g neo4j-mcp-readonly

# Or use with npx (no installation required)
npx neo4j-mcp-readonly --help
```

### Basic Usage

```bash
# Start with command line arguments
neo4j-mcp-readonly --neo4j-uri bolt://localhost:7687 --neo4j-username neo4j --neo4j-password mypassword

# Or use environment variables
NEO4J_URI=bolt://localhost:7687 NEO4J_USERNAME=neo4j NEO4J_PASSWORD=mypassword neo4j-mcp-readonly
```

## 📋 Features

- **🔒 Read-only queries**: Only allows safe read operations (MATCH, RETURN, WITH, UNWIND, etc.)
- **🛡️ Query validation**: Automatically blocks dangerous operations like CREATE, DELETE, SET, MERGE
- **🔍 Schema exploration**: Get database schema information including labels, relationships, and properties
- **📊 Database statistics**: Node/relationship counts, property analysis, and more
- **🧪 Connection testing**: Built-in connection testing functionality
- **⚡ CLI support**: Easy command-line configuration
- **🐳 Docker ready**: Example Docker Compose configuration included
- **🔧 Flexible auth**: Support for environment variables and command-line arguments

## 🛠️ Configuration Methods

### Method 1: Command Line Arguments

```bash
neo4j-mcp-readonly \
  --neo4j-uri bolt://localhost:7687 \
  --neo4j-username neo4j \
  --neo4j-password your_password
```

### Method 2: Environment Variables

```bash
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=your_password
neo4j-mcp-readonly
```

### Method 3: Mixed Approach

```bash
# Environment for sensitive data, CLI for the rest
export NEO4J_PASSWORD=your_secure_password
neo4j-mcp-readonly --neo4j-uri bolt://myserver:7687 --neo4j-username myuser
```

## 🎯 Usage with Cursor IDE

### Option 1: Using npx (Recommended)

Add this to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "neo4j": {
      "command": "npx",
      "args": [
        "neo4j-mcp-readonly",
        "--neo4j-uri", "bolt://localhost:7687",
        "--neo4j-username", "neo4j",
        "--neo4j-password", "your_password_here"
      ]
    }
  }
}
```

### Option 2: Using Environment Variables

```json
{
  "mcpServers": {
    "neo4j": {
      "command": "npx",
      "args": ["neo4j-mcp-readonly"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "your_password_here"
      }
    }
  }
}
```

### Option 3: Minimal Setup (Password Only)

For simple local setups where you only need to specify the password:

```json
{
  "mcpServers": {
    "neo4j": {
      "command": "npx",
      "args": ["neo4j-mcp-readonly", "--neo4j-password", "your_password_here"]
    }
  }
}
```

This assumes default values: `bolt://localhost:7687` and username `neo4j`.

### Configuration Steps

1. **Install the package** (if not using npx):
   ```bash
   npm install -g neo4j-mcp-readonly
   ```

2. **Add MCP server to Cursor**:
   - Open Cursor IDE
   - Go to Cursor Settings (Cmd/Ctrl + ,)
   - Search for "MCP" or go to Extensions > MCP
   - Add the configuration (see examples above)

3. **Restart Cursor** for changes to take effect

4. **Start querying**:
   ```
   Can you show me the schema of my Neo4j database?
   How many User nodes do I have?
   Show me sample data for the Movie label
   ```

## 🛠️ Available Tools

### Core Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `neo4j_query` | Execute read-only Cypher queries | `query` (required), `parameters` (optional) |
| `neo4j_schema` | Get database schema (labels, relationships, properties) | None |
| `neo4j_test_connection` | Test database connectivity | None |

### Analysis Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `neo4j_node_count` | Count nodes by label or total | `label` (optional) |
| `neo4j_relationship_count` | Count relationships by type or total | `type` (optional) |
| `neo4j_database_info` | Get Neo4j version, edition, and statistics | None |
| `neo4j_sample_data` | Get sample data for exploration | `label` OR `relationshipType`, `limit` (optional, max 50) |

### Schema Analysis Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `neo4j_indexes` | List all database indexes | None |
| `neo4j_constraints` | List all database constraints | None |
| `neo4j_node_properties` | Analyze properties of a node label | `label` (required) |
| `neo4j_relationship_properties` | Analyze properties of a relationship type | `type` (required) |

## 💡 Example Queries

### Basic Data Exploration
```cypher
MATCH (n:Person) RETURN n.name, n.age LIMIT 10
```

### Relationship Analysis
```cypher
MATCH (p:Person)-[r:FRIENDS_WITH]->(f:Person) 
RETURN p.name, f.name, r.since
```

### Property-based Filtering
```cypher
MATCH (m:Movie) 
WHERE m.year > 2000 
RETURN m.title, m.year 
ORDER BY m.year DESC
```

## 🔒 Security Features

### Allowed Operations
- `MATCH` - Pattern matching
- `RETURN` - Return results  
- `WITH` - Chain query parts
- `UNWIND` - Expand lists
- `SHOW` - Show database metadata
- Read-only `CALL` procedures (schema, labels, etc.)

### Blocked Operations
- `CREATE` - Creating nodes/relationships
- `DELETE` / `DETACH DELETE` - Deleting data
- `MERGE` - Creating or matching
- `SET` - Setting properties
- `REMOVE` - Removing properties/labels
- `DROP` - Dropping indexes/constraints
- `ALTER` - Altering schema
- Most `CALL` procedures (except read-only ones)

## 🐳 Docker Setup

Use the provided Docker Compose example:

```bash
# Copy the example
cp examples/docker-compose.yml .

# Edit password in docker-compose.yml
# Then start Neo4j
docker-compose up -d

# Connect with MCP server
neo4j-mcp-readonly --neo4j-password your_password_here
```

## 🔧 Development

### Local Development

```bash
git clone https://github.com/ThisIsVoid/neo4j-mcp-readonly.git
cd neo4j-mcp-readonly
npm install
npm run build
npm run dev
```

### Building

```bash
npm run build
```

### Testing

```bash
# Test connection
neo4j-mcp-readonly --help

# Test with your database
NEO4J_PASSWORD=test neo4j-mcp-readonly
```

## 📚 Advanced Configuration

### Custom Neo4j Configurations

```bash
# Neo4j Aura
neo4j-mcp-readonly \
  --neo4j-uri neo4j+s://xxxx.databases.neo4j.io \
  --neo4j-username neo4j \
  --neo4j-password your_aura_password

# Neo4j Enterprise with custom port
neo4j-mcp-readonly \
  --neo4j-uri bolt://enterprise-server:7687 \
  --neo4j-username readonly_user \
  --neo4j-password readonly_password

# Local Neo4j with custom database
neo4j-mcp-readonly \
  --neo4j-uri bolt://localhost:7687/movies \
  --neo4j-username neo4j \
  --neo4j-password mypassword
```

### Environment File Setup

Create a `.env` file:

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password
```

Then run:
```bash
source .env
neo4j-mcp-readonly
```

## 🚨 Troubleshooting

### Connection Issues

1. **Verify Neo4j is running**:
   ```bash
   # Check if Neo4j is listening
   netstat -an | grep 7687
   ```

2. **Test direct connection**:
   ```bash
   # Use Neo4j's cypher-shell
   cypher-shell -u neo4j -p your_password
   ```

3. **Check firewall/network**:
   - Ensure port 7687 is accessible
   - Check if authentication is required

### Configuration Issues

1. **Invalid credentials**:
   ```
   Configuration error:
     neo4j.password: Password is required
   ```
   **Solution**: Provide password via `--neo4j-password` or `NEO4J_PASSWORD`

2. **Connection refused**:
   ```
   Failed to connect to Neo4j: ServiceUnavailable
   ```
   **Solution**: Check URI and ensure Neo4j is running

### MCP Issues

1. **Server not found in Cursor**:
   - Verify npx can find the package: `npx neo4j-mcp-readonly --help`
   - Check Cursor MCP configuration syntax
   - Restart Cursor after configuration changes

2. **Query blocked**:
   ```
   Query contains forbidden operations
   ```
   **Solution**: Ensure query only contains allowed read operations

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📊 Publishing to NPM

Publishing to NPM is **free** for open source packages. Here's how to publish:

### First Time Setup

1. **Create NPM account**: Visit [npmjs.com](https://www.npmjs.com) and sign up
2. **Login locally**: 
   ```bash
   npm login
   ```
3. **Update package.json**: Change repository URLs to your GitHub repo

### Publishing

```bash
# Build the package
npm run build

# Publish (runs prepublishOnly script automatically)
npm publish

# For beta versions
npm publish --tag beta
```

### Updating

```bash
# Update version
npm version patch  # or minor, major

# Publish update
npm publish
```

## 🌟 Star History

If this project helps you, please consider giving it a star on GitHub!

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/ThisIsVoid/neo4j-mcp-readonly/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/ThisIsVoid/neo4j-mcp-readonly/discussions)
- 📖 **Documentation**: This README and inline code comments
- 🎯 **Examples**: Check the `/examples` directory

---

**Made with ❤️ for the Neo4j and Cursor communities**