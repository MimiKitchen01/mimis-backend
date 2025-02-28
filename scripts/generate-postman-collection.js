import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: "Mimi's Kitchen API",
      version: '1.0.0',
      description: "API documentation for Mimi's Kitchen",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [path.join(__dirname, '../src/routes/*.js')], // Path to the API routes
};

try {
  const swaggerSpec = swaggerJsdoc(options);
  
  if (!swaggerSpec || !swaggerSpec.paths) {
    throw new Error('No paths found in Swagger specification');
  }

  console.log('Swagger spec generated successfully');

  const postmanCollection = {
    info: {
      name: "Mimi's Kitchen API",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      description: "Generated from Swagger/OpenAPI specification"
    },
    item: [],
    variable: [
      {
        key: "baseUrl",
        value: `http://localhost:${process.env.PORT || 3000}`,
        type: "string"
      }
    ]
  };

  // Debug log
  console.log('Available paths:', Object.keys(swaggerSpec.paths));

  // Convert paths to Postman format
  Object.keys(swaggerSpec.paths || {}).forEach(path => {
    const methods = swaggerSpec.paths[path];
    if (!methods) return;

    Object.keys(methods).forEach(method => {
      const endpoint = methods[method];
      if (!endpoint) return;

      const postmanRequest = {
        name: endpoint.summary || path,
        request: {
          method: method.toUpperCase(),
          header: [],
          url: {
            raw: "{{baseUrl}}" + path,
            host: ["{{baseUrl}}"],
            path: path.split('/').filter(p => p)
          }
        },
        response: []
      };

      // Add authentication if required
      if (endpoint.security && endpoint.security.some(s => s.BearerAuth)) {
        postmanRequest.request.auth = {
          type: "bearer",
          bearer: [
            {
              key: "token",
              value: "{{authToken}}",
              type: "string"
            }
          ]
        };
      }

      // Add request body if present
      if (endpoint.requestBody && endpoint.requestBody.content) {
        const contentType = Object.keys(endpoint.requestBody.content)[0];
        const schema = endpoint.requestBody.content[contentType]?.schema;
        
        if (schema) {
          if (contentType === 'multipart/form-data') {
            postmanRequest.request.body = {
              mode: 'formdata',
              formdata: Object.keys(schema.properties || {}).map(key => ({
                key,
                type: schema.properties[key].type === 'string' ? 'text' : 'file',
                src: []
              }))
            };
          } else {
            postmanRequest.request.body = {
              mode: "raw",
              raw: JSON.stringify({
                ...Object.keys(schema.properties || {}).reduce((acc, key) => ({
                  ...acc,
                  [key]: getExampleValue(schema.properties[key])
                }), {})
              }, null, 2),
              options: {
                raw: {
                  language: "json"
                }
              }
            };
          }
        }
      }

      // Group by tags
      const tag = endpoint.tags?.[0] || 'No Tag';
      let tagGroup = postmanCollection.item.find(i => i.name === tag);
      if (!tagGroup) {
        tagGroup = { name: tag, item: [] };
        postmanCollection.item.push(tagGroup);
      }
      tagGroup.item.push(postmanRequest);
    });
  });

  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, '../postman');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Save collection file
  const outputPath = path.join(outputDir, 'collection.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(postmanCollection, null, 2)
  );

  console.log(`Postman collection generated successfully at: ${outputPath}`);
} catch (error) {
  console.error('Error generating Postman collection:', error);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
}

function getExampleValue(property) {
  switch (property.type) {
    case 'string':
      return property.example || 'string';
    case 'number':
      return property.example || 0;
    case 'boolean':
      return property.example || false;
    case 'array':
      return property.example || [];
    case 'object':
      return property.example || {};
    default:
      return null;
  }
}
