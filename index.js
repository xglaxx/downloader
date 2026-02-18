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
   
   _renderEv(on, obj) {
      for (const tag of ["progress", "verified", "completed", "error"]) {
         on(tag, (res) => {
            this.emit(tag, Object.assign({}, res, obj));
         });
      }
   }
   
   async start() {
      if (this.sequenceDownloader.length) {
         return Promise.all(this.sequenceDownloader.map((job, index) => {
            if (!/https:\/\//.test(job?.url)) return Promise.reject({ message: "A url não foi identificado.", error: job });
            
            const jobDl = DownloaderJob(Object.assign({}, this, job));
            this._renderEv(jobDl.on, job);
            return () => jobDl.start().finally(() => this.sequenceDownloader.splice(1, index));
         }));
      } else {
         const job = DownloaderJob(this);
         if (!/https:\/\//.test(this.url)) return Promise.reject({ message: "A url não foi identificado.", error: this });
         
         this._renderEv(job.on, { url: this.url, output: this.output });
         return job.start();
      }
   }
   
}