import { Request, Response } from 'express';
import app from './app';
import { connectDB } from './config/db';

let isDbConnected = false;

export default async function handler(req: Request, res: Response) {
  if (!isDbConnected) {
    await connectDB();
    isDbConnected = true;
  }
  return app(req, res);
}
