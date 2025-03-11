import swaggerJsdoc from 'swagger-jsdoc';
import chalk from 'chalk';
import logger from '../utils/logger.js';

logger.info({
  message: chalk.blue('📚 Loading Swagger configuration'),
  details: {
    title: chalk.cyan("Mimi's Kitchen API"),
    version: chalk.yellow('1.0.0')
  }
});

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
  apis: ['./src/routes/*.js'], // Path to the API routes
};

export default swaggerJsdoc(options);
