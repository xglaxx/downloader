import fs from 'fs';
export default class FileMetadataStore {
   constructor(path) {
      this.path = path+".json";
   }
   async load() {
      try {
         const raw = await fs.promises.readFile(this.path, 'utf-8');
         if (!raw.trim()) return null;
         
         return JSON.parse(raw);
      } catch (err) {
         if (err.code === 'ENOENT') return null;
         throw err;
      }
   }
   
   async save(data) {
      const tmp = this.path + '.tmp';
      await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.promises.rename(tmp, this.path);
   }
   
   async delete() {
      if (fs.existsSync(this.path)) {
         await fs.promises.unlink(this.path);
      }
   }
}