import EventEmitter from 'events';
import StateMachine from './StateMachine.js';
import SegmentWorker from './SegmentWorker.js';
import ProgressTracker from './ProgressTracker.js';
import SegmentScheduler from './SegmentScheduler.js';

export default class DownloadJob extends EventEmitter {
   constructor({
      output,
      rename,
      storage,
      dataSource,
      retryPolicy,
      metadataStore,
      integrityValidator,
      segmentSize = (1024 * 1024),
      concurrency = 4
   }) {
      super();
      this.path = output;
      this.rename = rename;
      this.dataSource = dataSource;
      this.storage = storage;
      this.metadataStore = metadataStore;
      this.retryPolicy = retryPolicy;
      this.integrityValidator = integrityValidator;
      this.segmentSize = segmentSize;
      this.concurrency = concurrency;
      this.metadataStore = metadataStore;
      this.stateMachine = new StateMachine('idle', {
         idle: ['preparing'],
         preparing: ['downloading', 'failed'],
         downloading: ['verifying', 'paused', 'failed'],
         verifying: ['completed', 'failed'],
         paused: ['downloading'],
         failed: [],
         completed: []
      });
      this.abortController = new AbortController();
   }
   
   logsConsole(message) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(message.toString());
   }
   
   async start() {
      try {
         this.stateMachine.setState('preparing');
         let metadata = await this.metadataStore.load();
         if (!metadata) {
            const remoteMeta = await this.dataSource.getMetadata();
            if (!remoteMeta.acceptRanges) {
               this.segmentSize = remoteMeta.size;
               this.concurrency = 1;
            }
            
            metadata = {
               size: remoteMeta.size,
               etag: remoteMeta.etag,
               segments: this._createSegments(remoteMeta.size)
            };
            await this.storage.prepare(metadata.size);
            await this.metadataStore.save(metadata);
         }
         
         this.progressTracker = new ProgressTracker(metadata.size);
         this.stateMachine.setState('downloading');
         const scheduler = new SegmentScheduler({
            segments: metadata.segments,
            concurrency: this.concurrency,
            workerFactory: (segment) => {
               return new SegmentWorker({
                  segment,
                  dataSource: this.dataSource,
                  storage: this.storage,
                  retryPolicy: this.retryPolicy,
                  signal: this.abortController.signal,
                  onProgress: async (bytes) => {
                     this.progressTracker.update(bytes);
                     this.emit('progress', this.progressTracker.getStats());
                  }
               });
            }
         });
         await scheduler.start();
         this.stateMachine.setState('verifying');
         const hash = await this.integrityValidator.sha256();
         this.emit('verified', hash);
         await this.metadataStore.delete();
         this.stateMachine.setState('completed');
         this.path = await this.rename.readjustFile(); 
         this.emit('completed', { file: this.path, ...this.rename.sizeBytesFile(this.path) });
      } catch (err) {
         this.stateMachine.setState('failed');
         this.emit('error', err);
         throw err;
      } finally {
         await this.storage.close();
      }
      return this;
   }
   
   pause() {
      this.abortController.abort();
      this.stateMachine.setState('paused');
   }
   
   _createSegments(totalSize) {
      let start = 0;
      const segments = [];
      while (start < totalSize) {
         const end = Math.min(start + this.segmentSize - 1, totalSize - 1);
         segments.push({ start, end, completed: false });
         start += this.segmentSize;
      }
      
      return segments;
   }
   
}