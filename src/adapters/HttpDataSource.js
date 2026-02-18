import https from 'https';
import DataSource from '../ports/DataSource.js';
export default class HttpDataSource extends DataSource {
   constructor(url) {
      super();
      this.url = url;
   }
   
   isNumber(val) {
      val = Number(val);
      return (!isNaN(val) ? val : 0);
   }
   
   async getUrlInfo(url, options = {}) {
      if (!url) url = this.url;
      return new Promise((resolve, reject) => {
         const req = https.request(url, { method: 'HEAD', ...options }, res => {
            if (res.statusCode >= 400) {
               reject(new Error(`HTTP ${res.statusCode}`));
            }
            
            resolve(res);
         });
         req.on('error', reject);
         req.end();
      });
   }
   
   async getMetadata() {
      return this.getUrlInfo().then(async (res) => {
         let size = this.isNumber(res.headers['content-length']);
         if (size) {
            return Promise.resolve({
               size: parseInt(size, 10),
               etag: res.headers.etag,
               acceptRanges: res.headers['accept-ranges'] === 'bytes'
            });
         } else {
            return this.getUrlInfo(false, {
               method: 'GET',
               headers: { Range: 'bytes=0-0' }
            }).then(async (range) => {
               const contentRange = range.headers['content-range'];
               if (contentRange) {
                  const [_, match] = contentRange.match(/\/(\d+)$/) || [];
                  if (match) return Promise.resolve({
                     size: parseInt(this.isNumber(match), 10),
                     etag: range.headers.etag,
                     acceptRanges: range.headers['accept-ranges'] === 'bytes'
                  });
               }
               
               return Promise.reject(range);
            });
         }
      });
   }
   
   async getStream(range) {
      return new Promise((resolve, reject) => {
         const headers = {};
         if (range) headers.Range = `bytes=${range.start}-${range.end}`;
         
         const req = https.get(this.url, { headers }, res => {
            if (range && res.statusCode !== 206) {
               reject({ message: 'Servidor ignorou a solicitação de alcance.', ...res });
            }
            
            resolve(res);
         });
         req.on('error', reject);
      });
   }
}