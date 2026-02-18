export default class DownloadManager {
   constructor({ jobFactory }) {
      this.jobFactory = jobFactory;
   }
   
   async download(config) {
      const job = this.jobFactory(config);
      return job.start();
   }
}