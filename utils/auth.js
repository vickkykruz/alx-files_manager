import redisClient from './redis';
import dbClient from './db';

async function getUserWithToken(token) {
  if (!token) return null;
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return null;
  const user = await dbClient.getUser(userId);
  return user;
}

// eslint-disable-next-line import/prefer-default-export
export { getUserWithToken };}
