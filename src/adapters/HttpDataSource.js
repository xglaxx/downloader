import fs from 'fs';
import fetch from 'node-fetch';
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
      return fetch(url, { method: 'HEAD', ...options }).then((res) => {
         if (res.status >= 400) {
            return Promise.reject(new Error(`HTTP ${res.status}`));
         }
         
         return Promise.resolve(res);
      });
   }
   
   async getMetadata() {
      return this.getUrlInfo().then(async (res) => {
         let size = this.isNumber(res.headers.get('content-length'));
         if (size) {
            return Promise.resolve({
               size: parseInt(size, 10),
               etag: res.headers.get('etag'),
               acceptRanges: res.headers.get('accept-ranges') === 'bytes'
            });
         } else {
            return this.getUrlInfo(false, {
               method: 'GET',
               headers: { Range: 'bytes=0-0' }
            }).then(async (range) => {
               size = this.isNumber(range.headers.get('content-length'));
               const contentRange = range.headers.get('content-range');
               const config = { etag: range.headers.get('etag'), acceptRanges: range.headers.get('accept-ranges') === 'bytes' }
               if (contentRange) {
                  const [_, match] = contentRange.match(/\/(\d+)$/) || [];
                  if (match) return Promise.resolve({
                     size: parseInt(this.isNumber(match), 10),
                     ...config
                  });
               } else if (size) {
                  return Promise.resolve({
                     size: parseInt(size, 10),
                     ...config
                  });
               }
               
               return Promise.reject(range);
            });
         }
      });
   }
   
   async getStream(range) {
      const headers = {};
      if (range) headers.Range = `bytes=${range.start}-${range.end}`;
      return fetch(this.url, headers).then((res) => {
         if (res.status >= 400) {
            return fetch(this.url, {});
         }
         
         return Promise.resolve(res);
      });
   }
}