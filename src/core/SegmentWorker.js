export default class SegmentWorker {
   constructor({ segment, dataSource, storage, retryPolicy, signal, onProgress }) {
      this.signal = signal;
      this.segment = segment;
      this.storage = storage;
      this.onProgress = onProgress;
      this.dataSource = dataSource;
      this.retryPolicy = retryPolicy;
   }
   
   async run() {
      await this.retryPolicy.execute(async () => {
         if (this.signal?.aborted) throw new Error('Aborted');
         
         const stream = await this.dataSource.getStream({
            start: this.segment.start,
            end: this.segment.end
         });
         await this.storage.writeStreamWithProgress(stream, this.segment, (bytes) => this.onProgress(bytes), this.signal);
      });
      this.segment.completed = true;
   }
}