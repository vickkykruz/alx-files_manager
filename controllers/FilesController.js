/* eslint-disable object-curly-newline */
/* eslint-disable comma-dangle */
import fs from 'fs';
import crypto from 'crypto';
import mime from 'mime-types';
import Bull from 'bull';
import dbClient from '../utils/db';
import { getUserWithToken } from '../utils/auth';

async function createAndSaveFile(data) {
  const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager/';
  try {
    await fs.access(folderPath, fs.constants.F_OK);
  } catch (err) {
    await fs.mkdir(folderPath);
  }
  const fileName = crypto.randomUUID();
  const fileData = Buffer.from(data, 'base64').toString('utf-8');
  await fs.writeFile(folderPath + fileName, fileData);
  return folderPath + fileName;
}

const fileQueue = new Bull('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const user = await getUserWithToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = user._id;
    const { name, type, data } = req.body;
    let { parentId, isPublic } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }
    if (parentId) {
      const parent = await dbClient.getFile(parentId);
      if (!parent) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parent.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    } else {
      parentId = 0;
    }
    if (!isPublic) isPublic = false;
    let fileId;
    if (type !== 'folder') {
      const localPath = await createAndSaveFile(data);
      fileId = await dbClient.createFile(
        name,
        type,
        parentId,
        isPublic,
        userId,
        localPath
      );
      if (type === 'image') {
        fileQueue.add({ userId, fileId });
      }
    } else {
      fileId = await dbClient.createFolder(
        name,
        type,
        parentId,
        isPublic,
        userId
      );
    }
    return res
      .status(201)
      .json({ id: fileId, userId, name, type, isPublic, parentId });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const user = await getUserWithToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const file = await dbClient.verifyFileUser(id, user._id);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { _id, userId, name, type, isPublic, parentId } = file;
    return res
      .status(200)
      .json({ id: _id, userId, name, type, isPublic, parentId });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const user = await getUserWithToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { parentId, page } = req.query;
    const files = await dbClient.getFiles(parentId, page);
    return res.status(200).json(
      files.map(({ _id, userId, name, type, isPublic, parentId }) => ({
        id: _id,
        userId,
        name,
        type,
        isPublic,
        parentId,
      }))
    );
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const user = await getUserWithToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const file = await dbClient.verifyFileUser(id, user._id);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    await dbClient.updateFile(id, { isPublic: true });
    const { _id, userId, name, type, parentId } = file;
    return res
      .status(200)
      .json({ id: _id, userId, name, type, isPublic: true, parentId });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const user = await getUserWithToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const file = await dbClient.verifyFileUser(id, user._id);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    await dbClient.updateFile(id, { isPublic: false });
    const { _id, userId, name, type, parentId } = file;
    return res
      .status(200)
      .json({ id: _id, userId, name, type, isPublic: false, parentId });
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const file = await dbClient.getFile(id);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (!file.isPublic) {
      const token = req.headers['x-token'];
      const user = await getUserWithToken(token);
      if (!user) {
        return res.status(404).json({ error: 'Not found' });
      }
      const verifiedFile = await dbClient.verifyFileUser(id, user._id);
      if (!verifiedFile) {
        return res.status(404).json({ error: 'Not found' });
      }
    }
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }
    let { size } = req.query;
    if (!size) size = '';
    try {
      const data = await fs.readFile(file.localPath + size);
      const mimeType = mime.lookup(file.name);
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(data);
    } catch (e) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;
