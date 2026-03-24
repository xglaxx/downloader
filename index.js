import EventEmitter from 'events';
import DownloaderJob from './src/index.js';
export default class Downloader extends EventEmitter {
   constructor({ url, path, retryPolicy, concurrency }) {
      super();
      this.url = url;
      this.output = (path || "./tmp/"+Date.now());
      this.concurrency = (concurrency || 3);
      this.retryPolicy = (retryPolicy || 1);
      this.sequenceDownloader = [];
   }
   
   addUrl(url, output) {
      const isAdd = this.sequenceDownloader.find(v => v.url === url || v.output === output);
      if (!isAdd) {
         this.sequenceDownloader.push({ url, output: (output || "./tmp/"+Date.now()) });
      }
   }
   
   async start() {
      const tagEvent = ["progress", "verified", "completed", "error"];
      if (this.sequenceDownloader.length) {
         const active = new Set();
         while (this.sequenceDownloader.length) {
            const next = this.sequenceDownloader.shift();
            if (/https:\/\//.test(next?.url)) {
               let _s;
               const jobDl = DownloaderJob(Object.assign(this, next));
               for (const tag of tagEvent) {
                  jobDl.on(tag, (res) => {
                     this.emit(tag, Object.assign({}, res, { url: next.url, output: jobDl.path }));
                  });
               }
               try {
                  _s = await jobDl.start();
               } catch (error) {
                  _s = error;
               } finally {
                  active.add(_s);
               }
            }
         }
         return active;
      } else {
         const job = DownloaderJob(this);
         if (!/https:\/\//.test(this.url)) return Promise.reject({ message: "A url não foi identificado.", error: this });
         
         for (const tag of tagEvent) {
            job.on(tag, (res) => {
               this.emit(tag, Object.assign({}, res, { url: this.url, output: job.path }));
            });
         }
         return job.start();
      }
   }
   
}