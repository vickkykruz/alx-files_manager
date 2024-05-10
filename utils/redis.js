import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.log(err));
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, data) => {
        if (err) reject(err);
        resolve(data);
      });
    });
  }

  async set(key, value, duration) {
    await this.client.setex(key, duration, value);
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
