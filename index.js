import EventEmitter from 'events';
import DownloaderJob from './src/cli/index.js';
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
         return Promise.all(this.sequenceDownloader.map((job, index) => {
            if (!/https:\/\//.test(job?.url)) return Promise.reject({ message: "A url não foi identificado.", error: job });
            
            const jobDl = DownloaderJob(Object.assign({}, this, job));
            for (const tag of tagEvent) {
               jobDl.on(tag, (res) => {
                  this.emit(tag, Object.assign({}, res, { url: job.url, output: jobDl.path }));
               });
            }
            return () => jobDl.start().finally(() => this.sequenceDownloader.splice(1, index));
         }));
      } else {
         const job = DownloaderJob(this);
         if (!/https:\/\//.test(this.url)) return Promise.reject({ message: "A url não foi identificado.", error: this });
         
         for (const tag of tagEvent) {
            jobDl.on(tag, (res) => {
               this.emit(tag, Object.assign({}, res, { url: this.url, output: job.path }));
            });
         }
         return job.start();
      }
   }
   
}