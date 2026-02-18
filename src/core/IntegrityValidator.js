import fs from 'fs';
import crypto from 'crypto';

export default class IntegrityValidator {
   constructor(path) {
      this.path = path;
   }
   
   async sha256() {
      return new Promise((resolve, reject) => {
         const hash = crypto.createHash('sha256');
         const stream = fs.createReadStream(this.path);
         stream.on('data', chunk => hash.update(chunk));
         stream.on('end', () => resolve(hash.digest('hex')));
         stream.on('error', reject);
      });
   }
}