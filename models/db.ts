//models/db.ts
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const url: string = process.env.DB_URL || 'mongodb://localhost:27017';
const dbName: string = process.env.DB_NAME || 'your';

let db: Db | null = null;

export const connectDB = async (): Promise<Db> => {
  if (db) return db;
  const client = new MongoClient(url);
  await client.connect();
  db = client.db(dbName);
  console.log(`Connected to database: ${dbName}`);
  return db;
};
