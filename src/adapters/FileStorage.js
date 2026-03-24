import fs from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { fileTypeFromFile, fileTypeFromStream, fileTypeFromBuffer } from 'file-type';
export default class FileStorage {
   constructor({ path, rename }) {
      this.path = path;
      this.handle = null;
      this.rename = rename;
   }
   
   async sleep(delay) {
      return new Promise((resolve) => setTimeout(() => resolve('ok!'), delay * 1000));
   }
   
   async write(buffer, position) {
      if (!this.handle) {
         throw new Error('Não foi criado o handle.');
      }
      
      return this.handle.write(buffer, 0, buffer.length, position);
   }
   
   async prepare(size) {
      this.handle = await fs.promises.open(this.path, 'w');
      await this.handle.truncate(size);
   }
   
   async writeStreamWithProgress(stream, offset, onProgress, signal) {
      const fileStream = fs.createWriteStream(this.path, {
         flags: offset > 0 ? 'r+' : 'w',
         start: offset
      });
      const progressStream = new Transform({
         transform(chunk, encoding, callback) {
            if (onProgress) onProgress(chunk.length);
            callback(null, chunk); // passa o chunk adiante
         }
      });
      if (signal) {
         signal.addEventListener('abort', () => {
            fileStream.destroy(new Error('Aborted'));
         });
      }
      
      try {
         await pipeline(stream, progressStream, fileStream);
         return this.path;
      } catch(error) {
         fileStream.destroy();
         throw error;
      }
   }
   
   async close() {
      if (this.handle) {
         await this.handle.close();
         this.handle = null;
      }
   }
}