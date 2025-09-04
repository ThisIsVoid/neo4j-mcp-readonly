# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added
- Initial release of Neo4j MCP Server
- Read-only Cypher query execution with comprehensive validation
- 11 powerful database exploration tools:
  - `neo4j_query` - Execute read-only Cypher queries
  - `neo4j_schema` - Get database schema information
  - `neo4j_test_connection` - Test database connectivity
  - `neo4j_node_count` - Count nodes by label or total
  - `neo4j_relationship_count` - Count relationships by type or total
  - `neo4j_database_info` - Get Neo4j version and statistics
  - `neo4j_indexes` - List all database indexes
  - `neo4j_constraints` - List all database constraints
  - `neo4j_sample_data` - Get sample data for exploration
  - `neo4j_node_properties` - Analyze node properties by label
  - `neo4j_relationship_properties` - Analyze relationship properties by type
- Command-line interface with argument parsing
- Environment variable support for configuration
- Comprehensive security validation blocking write operations
- Support for Neo4j 5.x Community and Enterprise editions
- Docker Compose example configuration
- Cursor IDE integration examples

### Security
- Strict read-only query validation
- Blocked operations: CREATE, DELETE, MERGE, SET, REMOVE, DROP, ALTER
- Safe CALL procedure filtering
- Input validation and sanitization
- No hardcoded credentials

### Documentation
- Comprehensive README with installation and usage instructions
- Configuration examples for multiple scenarios
- Troubleshooting guide
- API documentation for all tools
