import { Request, Response } from 'express';
import app from '../src/app';
import { connectDB } from '../src/config/db';

let isDbConnected = false;

export default async function handler(req: Request, res: Response) {
  if (!isDbConnected) {
    await connectDB();
    isDbConnected = true;
  }
  
  // Vercel Serverless Functions will execute the Express app
  return app(req, res);
}
