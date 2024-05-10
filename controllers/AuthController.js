import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

async function generateToken(userId) {
  const token = crypto.randomUUID();
  await redisClient.set(`auth_${token}`, userId, 86400);
  return token;
}

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const [auth, credentials] = authHeader.split(' ');
    if (auth !== 'Basic') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const [email, password] = Buffer.from(credentials, 'base64')
      .toString('utf-8')
      .split(':');
    const user = await dbClient.verifyUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = await generateToken(user._id.toString());
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await redisClient.del(`auth_${token}`);
    return res.status(204).end();
  }
}

export default AuthController;
