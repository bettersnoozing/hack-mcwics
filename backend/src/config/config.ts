import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoURI: string;
  mongoDbName: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoURI: process.env.PROD_MONGO || process.env.DEV_MONGO || "bruh",
  mongoDbName: process.env.MONGO_DB_NAME || "hack-mcwics"
};

export default config;