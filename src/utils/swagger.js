// utils/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Node API Documentation',
            version: '1.0.0',
            description: 'API documentation for Node API',
        },
        servers: [
            {
                url: 'http://localhost:8080',
                description: 'Development server',
            },
        ],
        components: {
            schemas: {
                User: {
                    type: 'object',
                    required: [
                        'firstName',
                        'lastName',
                        'email',
                        'password',
                        'phone',
                        'role',
                    ],
                    properties: {
                        firstName: {
                            type: 'string',
                            description: 'User first name',
                        },
                        lastName: {
                            type: 'string',
                            description: 'User last name',
                        },
                        email: {
                            type: 'string',
                            description: 'User email address',
                        },
                        password: {
                            type: 'string',
                            description: 'User password',
                        },
                        phone: {
                            type: 'string',
                            description: 'User phone number',
                        },
                        role: {
                            type: 'string',
                            description: 'User role',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                        },
                        statusCode: {
                            type: 'integer',
                        },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
