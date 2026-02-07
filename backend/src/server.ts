import app from './app.ts';
import config from './config/config.ts';
import mongoose from 'mongoose';

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

async function startServer() {
  try {
    await mongoose.connect(config.mongoURI, { dbName: config.mongoDbName });
    console.log("Connected to Mongo");
    
    app.listen(config.port);
    console.log(`Server running on port ${config.port}`);
  } catch (err) {
    console.error("there was an error", err);
    process.exit(1);
  }
};

startServer();