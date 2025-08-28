// Add error handlers at the very top
process.on('uncaughtException', (error) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🚀 Starting application...');
console.log('🔍 Environment check:');
console.log('- Node version:', process.version);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log(
  '- DATABASE_URL preview:',
  process.env.DATABASE_URL?.substring(0, 20) + '...'
);

let app, connectToDatabase, disconnectFromDatabase;

try {
  console.log('📦 Loading app module...');
  app = require('./app');
  console.log('✅ App module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load app module:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

try {
  console.log('📦 Loading database config...');
  const dbConfig = require('./config/database');
  connectToDatabase = dbConfig.connectToDatabase;
  disconnectFromDatabase = dbConfig.disconnectFromDatabase;
  console.log('✅ Database config loaded successfully');
} catch (error) {
  console.error('❌ Failed to load database config:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    console.log('🔄 Attempting database connection...');
    await connectToDatabase();
    console.log('✅ Database connection established');

    console.log('🔄 Starting server on port', PORT);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
    });

    // Handle server startup errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

    const gracefulShutdown = async () => {
      console.log('🧹 Shutting down gracefully...');
      try {
        await disconnectFromDatabase();
        server.close(() => {
          console.log('🔒 Server closed');
          process.exit(0);
        });
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    console.error('❌ Error starting the server:');
    console.error('- Error name:', error.name);
    console.error('- Error message:', error.message);
    console.error('- Error code:', error.code);
    console.error('- Stack trace:', error.stack);
    process.exit(1);
  }
})();
