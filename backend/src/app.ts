import express from 'express';
import routes from './routes/routes.ts';
import authRouter from './routes/auth.routes.ts';
import { errorHandler } from './middleware/errorHandler.ts';

const app = express();

app.use(express.json());

// Routes
app.use('/', routes); // should probably split these into separate files and import them here
app.use('/auth', authRouter);

// // Global error handler (should be after routes)
app.use(errorHandler);

export default app;