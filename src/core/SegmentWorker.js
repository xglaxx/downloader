export default class SegmentWorker {
   constructor({ segment, dataSource, storage, retryPolicy, signal, onProgress }) {
      this.segment = segment;
      this.dataSource = dataSource;
      this.storage = storage;
      this.retryPolicy = retryPolicy;
      this.signal = signal;
      this.onProgress = onProgress;
   }
   
   async run() {
      await this.retryPolicy.execute(async () => {
         if (this.signal?.aborted) throw new Error('Aborted');
         
         const stream = await this.dataSource.getStream({
            start: this.segment.start,
            end: this.segment.end
         });
         await this.storage.writeStreamWithProgress(stream, this.segment.start, (bytes) => this.onProgress(bytes), this.signal);
      });
      this.segment.completed = true;
   }
}