const app = require('./app');
const {
  connectToDatabase,
  disconnectFromDatabase,
} = require('./config/database');
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectToDatabase();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });

    const gracefulShutdown = async () => {
      console.log('🧹 Shutting down gracefully...');
      await disconnectFromDatabase();
      server.close(() => {
        console.log('🔒 Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    console.error('❌ Error starting the server:', error);
    process.exit(1);
  }
})();
