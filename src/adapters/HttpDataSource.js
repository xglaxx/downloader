import fs from 'fs';
import fetch from 'node-fetch';
import DataSource from '../ports/DataSource.js';

export default class HttpDataSource extends DataSource {
   constructor(url, options) {
      super();
      this.url = url;
      this.headersOptions = options;
   }
   
   toNumber(val) {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
   }
   
   async getUrlInfo(url = this.url , options = {}) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 30 * 1000); 
      const Referer = new URL(url).origin;
      const headers = Object.assign({
         'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
         'Accept': '*/*',
         Referer,
      }, ("headers" in options ? options.headers : {}))
      options = Object.assign({
         method: 'GET',
         redirect: 'follow',
         signal: controller.signal
       }, options, { headers });
      const res = await fetch(url, options);
      if (res.status < 200 || res.status >= 300) {
         throw new Error(`HTTP ${res.status}`);
      }
      return res;
   }
   
   async getMetadata() {
      try {
         const range = await this.getUrlInfo(this.url, {
            headers: { Range: 'bytes=0-0' }
         });
         if (range.headers.get('x-cdn-success') === 'false') {
            throw new Error('CDN bloqueou ou link expirou');
         }
         
         const contentRange = range.headers.get('content-range');
         const sizeHeader = this.toNumber(range.headers.get('content-length'));
         const config = {
            finalUrl: range.url,
            etag: range.headers.get('etag'),
            acceptRanges: range.headers.get('accept-ranges') === 'bytes'
         };
         if (contentRange) {
            const match = contentRange.match(/\/(\d+)$/);
            if (match) {
               return {
                  size: this.toNumber(match[1]),
                  ...config
               };
            }
         } else {
            return {
               size: sizeHeader,
               ...config
            };
         }
      } catch (err) {
         throw err;
      }
   }
   
   async getStream(range) {
      const headers = {};
      if (range) headers.Range = `bytes=${range.start}-${range.end}`;
      
      const res = await this.getUrlInfo(this.url, { headers });
      if (!res.body) {
         throw new Error('Stream vazio!');
      }
      return res.body;
   }
}