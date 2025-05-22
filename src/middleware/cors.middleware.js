import cors from 'cors';
import logger from '../utils/logger.js';
import chalk from 'chalk';

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  credentials: false,
  maxAge: 86400,
  optionsSuccessStatus: 200
};

export const corsMiddleware = cors(corsOptions);

export const handleCors = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Length,Content-Range');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
};
