export default class ProgressTracker {
   constructor(totalBytes) {
      this.totalBytes = totalBytes;
      this.downloaded = 0;
      this.samples = [];
   }
   
   update(bytesDelta) {
      const now = Date.now();
      this.downloaded += bytesDelta;
      this.samples.push({ time: now, bytes: bytesDelta });
      // remove amostras antigas (>3s)
      this.samples = this.samples.filter(s => (now - s.time) <= 3000);
   }
   
   getStats() {
      const now = Date.now();
      const bytesRecent = this.samples.reduce((acc, s) => acc + s.bytes, 0);
      const timeWindow = (this.samples.length ? (now - this.samples[0].time) / 1000 : 1);
      const speed = (bytesRecent / timeWindow);
      const percent = ((this.downloaded / this.totalBytes) * 100).toFixed(2);
      const eta = (speed > 0 ? ((this.totalBytes - this.downloaded) / speed) : Infinity);
      return {
         downloaded: this.downloaded,
         percent,
         speed,
         eta
      };
   }
}