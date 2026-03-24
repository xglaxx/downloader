import fs from 'fs';
import fetch from 'node-fetch';
import DataSource from '../ports/DataSource.js';

export default class HttpDataSource extends DataSource {
   constructor(url) {
      super();
      this.url = url;
   }
   
   toNumber(val) {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
   }
   
   async getUrlInfo(url = this.url , options = {}) {
      const res = await fetch(url, { method: 'GET', ...options });
      if (res.status >= 400) {
         throw new Error(`HTTP ${res.status}`);
      }
      return res;
   }
   
   async getMetadata() {
      try {
         const res = await this.getUrlInfo();
         const encoding = res.headers.get('content-encoding');
         const sizeHeader = this.toNumber(res.headers.get('content-length'));
         if (!encoding && sizeHeader) {
            return {
               size: sizeHeader,
               etag: res.headers.get('etag'),
               acceptRanges: res.headers.get('accept-ranges') === 'bytes'
            };
         }
         // fallback com range
         const range = await this.getUrlInfo(this.url, {
            headers: { Range: 'bytes=0-0' }
         });
         const contentRange = range.headers.get('content-range');
         const config = {
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
         }
         
         const fallbackSize = this.toNumber(range.headers.get('content-length'));
         return {
            size: fallbackSize,
            ...config
         };
      } catch (err) {
         throw err;
      }
   }
   
   async getStream(range) {
      const headers = {};
      if (range) headers.Range = `bytes=${range.start}-${range.end}`;
      
      const res = await this.getUrlInfo(this.url, { headers });
      return res.body;
   }
}