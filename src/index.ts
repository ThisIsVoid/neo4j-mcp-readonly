#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import neo4j, { Driver, Session } from "neo4j-driver";
import { z } from "zod";
import { config } from "./config.js";

class Neo4jMCPServer {
  private server: Server;
  private driver: Driver | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "neo4j-mcp-server",
        version: "1.0.0",
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private async connectToNeo4j() {
    if (this.driver) {
      return this.driver;
    }

    try {
      this.driver = neo4j.driver(
        config.neo4j.uri,
        neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
        {
          disableLosslessIntegers: true,
        }
      );

      // Test the connection
      const session = this.driver.session();
      await session.run("RETURN 1");
      await session.close();

      console.error("Connected to Neo4j database");
      return this.driver;
    } catch (error) {
      console.error("Failed to connect to Neo4j:", error);
      throw error;
    }
  }

  private validateReadOnlyQuery(cypher: string): boolean {
    // Convert to lowercase and remove extra whitespace
    const normalizedQuery = cypher.toLowerCase().trim();
    
    // List of forbidden keywords that indicate write operations
    const forbiddenKeywords = [
      'create',
      'delete',
      'detach delete',
      'merge',
      'set',
      'remove',
      'drop',
      'alter',
      'constraint',
      'index',
      'call {',
      'load csv',
      'foreach',
      'with create',
      'with merge',
      'with delete',
      'with set',
      'with remove'
    ];

    // Check for forbidden keywords
    for (const keyword of forbiddenKeywords) {
      if (normalizedQuery.includes(keyword)) {
        return false;
      }
    }

    // Additional check for CALL procedures that might modify data
    if (normalizedQuery.includes('call ')) {
      // Allow only specific read-only procedures
      const allowedProcedures = [
        'db.schema',
        'db.labels',
        'db.relationshipTypes',
        'db.propertyKeys',
        'apoc.meta',
        'algo.',
        'gds.'
      ];
      
      const callMatch = normalizedQuery.match(/call\s+([a-zA-Z0-9_.]+)/);
      if (callMatch) {
        const procedure = callMatch[1];
        const isAllowed = allowedProcedures.some(allowed => 
          procedure.startsWith(allowed)
        );
        if (!isAllowed) {
          return false;
        }
      }
    }

    // Must start with allowed read operations
    const allowedStartKeywords = [
      'match',
      'return',
      'with',
      'unwind',
      'call db.schema',
      'call db.labels',
      'call db.relationshipTypes',
      'call db.propertyKeys',
      'call apoc.meta',
      'show'
    ];

    const startsWithAllowed = allowedStartKeywords.some(keyword => 
      normalizedQuery.startsWith(keyword)
    );

    return startsWithAllowed;
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "neo4j_query",
            description: "Execute read-only Cypher queries against the Neo4j database. Only MATCH, RETURN, WITH, UNWIND, and read-only CALL procedures are allowed.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The Cypher query to execute (read-only operations only)",
                },
                parameters: {
                  type: "object",
                  description: "Optional parameters for the query",
                  additionalProperties: true,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "neo4j_schema",
            description: "Get the database schema including node labels, relationship types, and property keys",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "neo4j_test_connection",
            description: "Test the connection to the Neo4j database",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "neo4j_node_count",
            description: "Get the count of nodes by label or total count of all nodes",
            inputSchema: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                  description: "Optional label to count nodes for. If not provided, returns total count of all nodes",
                },
              },
            },
          },
          {
            name: "neo4j_relationship_count",
            description: "Get the count of relationships by type or total count of all relationships",
            inputSchema: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  description: "Optional relationship type to count. If not provided, returns total count of all relationships",
                },
              },
            },
          },
          {
            name: "neo4j_database_info",
            description: "Get general database information including version, edition, and basic statistics",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "neo4j_indexes",
            description: "List all indexes in the database",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "neo4j_constraints",
            description: "List all constraints in the database",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "neo4j_sample_data",
            description: "Get sample data from the database for a specific label or relationship type",
            inputSchema: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                  description: "Node label to get sample data for",
                },
                relationshipType: {
                  type: "string",
                  description: "Relationship type to get sample data for",
                },
                limit: {
                  type: "number",
                  description: "Number of samples to return (default: 5, max: 50)",
                  minimum: 1,
                  maximum: 50,
                },
              },
            },
          },
          {
            name: "neo4j_node_properties",
            description: "Get all properties and their types for a specific node label",
            inputSchema: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                  description: "Node label to analyze properties for",
                },
              },
              required: ["label"],
            },
          },
          {
            name: "neo4j_relationship_properties",
            description: "Get all properties and their types for a specific relationship type",
            inputSchema: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  description: "Relationship type to analyze properties for",
                },
              },
              required: ["type"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "neo4j_query":
            return await this.handleQuery(args);
          case "neo4j_schema":
            return await this.handleSchema();
          case "neo4j_test_connection":
            return await this.handleTestConnection();
          case "neo4j_node_count":
            return await this.handleNodeCount(args);
          case "neo4j_relationship_count":
            return await this.handleRelationshipCount(args);
          case "neo4j_database_info":
            return await this.handleDatabaseInfo();
          case "neo4j_indexes":
            return await this.handleIndexes();
          case "neo4j_constraints":
            return await this.handleConstraints();
          case "neo4j_sample_data":
            return await this.handleSampleData(args);
          case "neo4j_node_properties":
            return await this.handleNodeProperties(args);
          case "neo4j_relationship_properties":
            return await this.handleRelationshipProperties(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async handleQuery(args: any) {
    const QuerySchema = z.object({
      query: z.string(),
      parameters: z.record(z.any()).optional().default({}),
    });

    const { query, parameters } = QuerySchema.parse(args);

    // Validate that the query is read-only
    if (!this.validateReadOnlyQuery(query)) {
      throw new Error(
        "Query contains forbidden operations. Only read operations (MATCH, RETURN, WITH, UNWIND, etc.) are allowed."
      );
    }

    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      const result = await session.run(query, parameters);
      const records = result.records.map(record => {
        const obj: any = {};
        record.keys.forEach((key, index) => {
          const value = record.get(index);
          obj[key] = this.convertNeo4jValue(value);
        });
        return obj;
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query,
              parameters,
              records,
              summary: {
                resultConsumedAfter: result.summary.resultConsumedAfter,
                resultAvailableAfter: result.summary.resultAvailableAfter,
                counters: result.summary.counters,
              },
            }, null, 2),
          },
        ],
      };
    } finally {
      await session.close();
    }
  }

  private async handleSchema() {
    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      const [labelsResult, relationshipsResult, propertiesResult] = await Promise.all([
        session.run("CALL db.labels()"),
        session.run("CALL db.relationshipTypes()"),
        session.run("CALL db.propertyKeys()"),
      ]);

      const schema = {
        labels: labelsResult.records.map(r => r.get(0)),
        relationshipTypes: relationshipsResult.records.map(r => r.get(0)),
        propertyKeys: propertiesResult.records.map(r => r.get(0)),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(schema, null, 2),
          },
        ],
      };
    } finally {
      await session.close();
    }
  }

  private async handleTestConnection() {
    try {
      const driver = await this.connectToNeo4j();
      const session = driver.session();
      
      const result = await session.run("RETURN 'Connection successful' as message");
      await session.close();

      return {
        content: [
          {
            type: "text",
            text: "Neo4j connection test successful!",
          },
        ],
      };
    } catch (error) {
      throw new Error(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleNodeCount(args: any) {
    const NodeCountSchema = z.object({
      label: z.string().optional(),
    });

    const { label } = NodeCountSchema.parse(args);
    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      let query: string;
      let result: any;

      if (label) {
        query = `MATCH (n:${label}) RETURN count(n) as count`;
        result = await session.run(query);
      } else {
        query = "MATCH (n) RETURN count(n) as count";
        result = await session.run(query);
      }

      const count = result.records[0].get('count').toNumber();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              label: label || "all_nodes",
              count,
              query,
            }, null, 2),
          },
        ],
      };
    } finally {
      await session.close();
    }
  }

  private async handleRelationshipCount(args: any) {
    const RelationshipCountSchema = z.object({
      type: z.string().optional(),
    });

    const { type } = RelationshipCountSchema.parse(args);
    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      let query: string;
      let result: any;

      if (type) {
        query = `MATCH ()-[r:${type}]-() RETURN count(r) as count`;
        result = await session.run(query);
      } else {
        query = "MATCH ()-[r]-() RETURN count(r) as count";
        result = await session.run(query);
      }

      const count = result.records[0].get('count').toNumber();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              type: type || "all_relationships",
              count,
              query,
            }, null, 2),
          },
        ],
      };
    } finally {
      await session.close();
    }
  }

  private async handleDatabaseInfo() {
    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      const [versionResult, nodeCountResult, relCountResult] = await Promise.all([
        session.run("CALL dbms.components() YIELD name, versions, edition"),
        session.run("MATCH (n) RETURN count(n) as nodeCount"),
        session.run("MATCH ()-[r]-() RETURN count(r) as relCount"),
      ]);

      const version = versionResult.records[0];
      const nodeCount = nodeCountResult.records[0].get('nodeCount').toNumber();
      const relCount = relCountResult.records[0].get('relCount').toNumber();

      const info = {
        name: version.get('name'),
        versions: version.get('versions'),
        edition: version.get('edition'),
        statistics: {
          totalNodes: nodeCount,
          totalRelationships: relCount,
        },
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } finally {
      await session.close();
    }
  }

  private async handleIndexes() {
    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      const result = await session.run("SHOW INDEXES");
      const indexes = result.records.map(record => {
        const obj: any = {};
        record.keys.forEach((key, index) => {
          obj[key] = this.convertNeo4jValue(record.get(index));
        });
        return obj;
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ indexes }, null, 2),
          },
        ],
      };
    } finally {
      await session.close();
    }
  }

  private async handleConstraints() {
    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      const result = await session.run("SHOW CONSTRAINTS");
      const constraints = result.records.map(record => {
        const obj: any = {};
        record.keys.forEach((key, index) => {
          obj[key] = this.convertNeo4jValue(record.get(index));
        });
        return obj;
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ constraints }, null, 2),
          },
        ],
      };
    } finally {
      await session.close();
    }
  }

  private async handleSampleData(args: any) {
    const SampleDataSchema = z.object({
      label: z.string().optional(),
      relationshipType: z.string().optional(),
      limit: z.number().min(1).max(50).optional().default(5),
    });

    const { label, relationshipType, limit } = SampleDataSchema.parse(args);
    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      let query: string;
      let result: any;

      if (label && relationshipType) {
        throw new Error("Please specify either 'label' for nodes or 'relationshipType' for relationships, not both");
      }

      if (label) {
        query = `MATCH (n:${label}) RETURN n LIMIT ${limit}`;
      } else if (relationshipType) {
        query = `MATCH (a)-[r:${relationshipType}]->(b) RETURN a, r, b LIMIT ${limit}`;
      } else {
        query = `MATCH (n) RETURN n LIMIT ${limit}`;
      }

      result = await session.run(query);
      const samples = result.records.map((record: any) => {
        const obj: any = {};
        record.keys.forEach((key: string, index: number) => {
          obj[key] = this.convertNeo4jValue(record.get(index));
        });
        return obj;
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query,
              sampleCount: samples.length,
              samples,
            }, null, 2),
          },
        ],
      };
    } finally {
      await session.close();
    }
  }

  private async handleNodeProperties(args: any) {
    const NodePropertiesSchema = z.object({
      label: z.string(),
    });

    const { label } = NodePropertiesSchema.parse(args);
    
    // Validate label name to prevent injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) {
      throw new Error("Invalid label name. Labels must contain only letters, numbers, and underscores.");
    }

    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      const query = `
        MATCH (n:\`${label}\`)
        UNWIND keys(n) AS key
        RETURN DISTINCT key, 
               apoc.meta.cypher.type(n[key]) AS type,
               count(*) AS frequency
        ORDER BY frequency DESC, key
      `;

      const result = await session.run(query);
      const properties = result.records.map(record => ({
        property: record.get('key'),
        type: record.get('type'),
        frequency: record.get('frequency').toNumber(),
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              label,
              properties,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      // Fallback if APOC is not available
      try {
        const fallbackQuery = `
          MATCH (n:\`${label}\`)
          UNWIND keys(n) AS key
          RETURN DISTINCT key, count(*) AS frequency
          ORDER BY frequency DESC, key
        `;
        
        const result = await session.run(fallbackQuery);
        const properties = result.records.map(record => ({
          property: record.get('key'),
          frequency: record.get('frequency').toNumber(),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                label,
                properties,
                note: "Property types not available (APOC not installed)",
              }, null, 2),
            },
          ],
        };
      } finally {
        await session.close();
      }
    } finally {
      await session.close();
    }
  }

  private async handleRelationshipProperties(args: any) {
    const RelationshipPropertiesSchema = z.object({
      type: z.string(),
    });

    const { type } = RelationshipPropertiesSchema.parse(args);
    const driver = await this.connectToNeo4j();
    const session = driver.session();

    try {
      const query = `
        MATCH ()-[r:${type}]-()
        UNWIND keys(r) AS key
        RETURN DISTINCT key, 
               apoc.meta.cypher.type(r[key]) AS type,
               count(*) AS frequency
        ORDER BY frequency DESC, key
      `;

      const result = await session.run(query);
      const properties = result.records.map(record => ({
        property: record.get('key'),
        type: record.get('type'),
        frequency: record.get('frequency').toNumber(),
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              relationshipType: type,
              properties,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      // Fallback if APOC is not available
      try {
        const fallbackQuery = `
          MATCH ()-[r:${type}]-()
          UNWIND keys(r) AS key
          RETURN DISTINCT key, count(*) AS frequency
          ORDER BY frequency DESC, key
        `;
        
        const result = await session.run(fallbackQuery);
        const properties = result.records.map(record => ({
          property: record.get('key'),
          frequency: record.get('frequency').toNumber(),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                relationshipType: type,
                properties,
                note: "Property types not available (APOC not installed)",
              }, null, 2),
            },
          ],
        };
      } finally {
        await session.close();
      }
    } finally {
      await session.close();
    }
  }

  private convertNeo4jValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    // Handle Neo4j Integer objects
    if (value.constructor && value.constructor.name === 'Integer') {
      return value.toNumber();
    }

    // Handle Node objects
    if (value.constructor && value.constructor.name === 'Node') {
      return {
        identity: value.identity.toNumber(),
        labels: value.labels,
        properties: this.convertNeo4jProperties(value.properties),
      };
    }

    // Handle Relationship objects
    if (value.constructor && value.constructor.name === 'Relationship') {
      return {
        identity: value.identity.toNumber(),
        start: value.start.toNumber(),
        end: value.end.toNumber(),
        type: value.type,
        properties: this.convertNeo4jProperties(value.properties),
      };
    }

    // Handle Path objects
    if (value.constructor && value.constructor.name === 'Path') {
      return {
        start: this.convertNeo4jValue(value.start),
        end: this.convertNeo4jValue(value.end),
        segments: value.segments.map((segment: any) => ({
          start: this.convertNeo4jValue(segment.start),
          relationship: this.convertNeo4jValue(segment.relationship),
          end: this.convertNeo4jValue(segment.end),
        })),
      };
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.convertNeo4jValue(item));
    }

    // Handle objects
    if (typeof value === 'object') {
      return this.convertNeo4jProperties(value);
    }

    return value;
  }

  private convertNeo4jProperties(properties: any): any {
    const converted: any = {};
    for (const [key, value] of Object.entries(properties)) {
      converted[key] = this.convertNeo4jValue(value);
    }
    return converted;
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("MCP Server error:", error);
    };

    process.on("SIGINT", async () => {
      if (this.driver) {
        await this.driver.close();
      }
      await this.server.close();
      process.exit(0);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Neo4j MCP Server running on stdio");
  }
}

const server = new Neo4jMCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
