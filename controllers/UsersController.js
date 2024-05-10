import dbClient from '../utils/db';
import { getUserWithToken } from '../utils/auth';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });
    try {
      const id = await dbClient.createUser(email, password);
      return res.status(201).json({ id, email });
    } catch (err) {
      if (err.message === 'User already exist') {
        return res.status(400).json({ error: 'Already exist' });
      }
      throw err;
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    const user = await getUserWithToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(200).json({ email: user.email, id: user._id });
  }
}

export default UsersController;
