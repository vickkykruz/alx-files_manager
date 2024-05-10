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

  async createUser(email, password) {
    const existingUser = await this.users.findOne({ email });
    if (existingUser) throw Error('User already exist');
    this.sHash.update(password);
    const hashedPassword = this.sHash.digest('hex');
    const result = await this.users.insertOne({
      email,
      password: hashedPassword,
    });
    return result.insertedId;
  }

  async getUser(id) {
    if (!id) return null;
    const user = await this.users.findOne({ _id: ObjectId(id) });
    return user;
  }

  async verifyUser(email, password) {
    if (!email || !password) return null;
    const user = await this.users.findOne({ email });
    if (!user) return null;
    this.sHash.update(password);
    const hashedPassword = this.sHash.digest('hex');
    if (hashedPassword !== user.password) return null;
    return user;
  }

  async createFile(name, type, parentId, isPublic, userId, localPath) {
    const result = await this.files.insertOne({
      name,
      type,
      parentId,
      userId,
      isPublic,
      localPath,
    });
    return result.insertedId;
  }

  async createFolder(name, type, parentId, isPublic, userId) {
    const result = await this.files.insertOne({
      name,
      type,
      parentId,
      userId,
      isPublic,
    });
    return result.insertedId;
  }

  async getFile(id) {
    if (!id) return null;
    const file = await this.files.findOne({ _id: ObjectId(id) });
    return file;
  }

  async verifyFileUser(fileId, userId) {
    if (!fileId || !userId) return null;
    const file = await this.getFile(fileId);
    if (!file) return null;
    if (file.userId.toString() !== userId.toString()) return null;
    return file;
  }

  async getFiles(parentId, page = 0) {
    const pipeline = [{ $skip: Number(page) * 20 }, { $limit: 20 }];
    // eslint-disable-next-line eqeqeq
    if (parentId && parentId != 0) {
      pipeline.unshift({ $match: { parentId } });
    }
    const files = await this.files.aggregate(pipeline).toArray();
    return files;
  }

  async updateFile(id, update) {
    if (!id || !update) return null;
    const result = await this.files.updateOne(
      { _id: ObjectId(id) },
      { $set: update }
    );
    return result;
  }
}

const dbClient = new DBClient();
export default dbClient;
