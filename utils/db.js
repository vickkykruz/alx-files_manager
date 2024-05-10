/* eslint-disable comma-dangle */
import crypto from 'crypto';
import { MongoClient } from 'mongodb';

async function createConnection() {
  const host = process.env.DB_HOST ? process.env.DB_HOST : 'localhost';
  const port = process.env.DB_PORT ? process.env.DB_PORT : 27016;
  const database = process.env.DB_DATABASE
    ? process.env.DB_DATABASE
    : 'files_manager';
  const url = `mongodb://${host}:${port}`;

  const client = new MongoClient(url, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(database);
  return db;
}

class DBClient {
  constructor() {
    this.db = null;
    createConnection().then((db) => {
      this.db = db;
      this.users = db.collection('users');
      this.files = db.collection('files');
    });
    this.sHash = crypto.createHash('sha1');
  }

  isAlive() {
    if (this.db) return true;
    return false;
  }

  async nbUsers() {
    return this.users.countDocuments();
  }

  async nbFiles() {
    return this.files.countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
