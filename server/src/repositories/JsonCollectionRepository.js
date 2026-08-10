const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

class JsonCollectionRepository {
  constructor({ filePath }) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async list() {
    return structuredClone(await this.#read());
  }

  async find(predicate) {
    const item = (await this.#read()).find(predicate);
    return item ? structuredClone(item) : null;
  }

  async filter(predicate) {
    return structuredClone((await this.#read()).filter(predicate));
  }

  async create(item) {
    return this.#mutate((items) => {
      if (items.some((current) => current.id === item.id)) {
        throw new Error(`重复的 runtime 记录 ID：${item.id}`);
      }
      items.push(structuredClone(item));
      return item;
    });
  }

  async update(id, updater) {
    return this.#mutate((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return null;
      const next = updater(structuredClone(items[index]));
      if (!next || next.id !== id) {
        throw new Error('Repository 更新必须保留记录 ID。');
      }
      items[index] = structuredClone(next);
      return next;
    });
  }

  async #mutate(operation) {
    const task = this.writeQueue.then(async () => {
      const items = await this.#read();
      const result = operation(items);
      await this.#write(items);
      return structuredClone(result);
    });
    this.writeQueue = task.catch(() => {});
    return task;
  }

  async #read() {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
        throw new Error('runtime JSON 结构无效。');
      }
      return parsed.items;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async #write(items) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    const content = `${JSON.stringify({ version: 1, items }, null, 2)}\n`;
    try {
      await fs.writeFile(tempPath, content, { encoding: 'utf8', flag: 'wx' });
      await fs.rename(tempPath, this.filePath);
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => {});
      throw error;
    }
  }
}

module.exports = { JsonCollectionRepository };
