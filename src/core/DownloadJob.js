import EventEmitter from 'events';
import * as readline from 'readline';
import StateMachine from './StateMachine.js';
import SegmentWorker from './SegmentWorker.js';
import ProgressTracker from './ProgressTracker.js';
import SegmentScheduler from './SegmentScheduler.js';

let lastLines = 0;
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
      this.storage = storage;
      this.dataSource = dataSource;
      this.retryPolicy = retryPolicy;
      this.segmentSize = segmentSize;
      this.concurrency = concurrency;
      this.metadataStore = metadataStore;
      this.integrityValidator = integrityValidator;
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
      message = String(message).trim();
      const lines = message.split('\n').length;
      if (process.stdout.isTTY) {
         process.stdout.moveCursor(0, -lastLines);
         process.stdout.cursorTo(0);
         process.stdout.clearScreenDown()
      }
      process.stdout.write(message + "\n");
      lastLines = lines;
   }
   
   async start() {
      const resMetadata = {};
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
               finalUrl: remoteMeta.finalUrl,
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
                  storage: this.storage,
                  dataSource: this.dataSource,
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
         const { file, ext, mimetype } = await this.rename.readjustFile();
         this.path = file;
         Object.assign(resMetadata, { file, ext, mime: mimetype }, this.rename.sizeBytesFile(this.path));
         this.emit('completed', resMetadata);
      } catch (err) {
         this.emit('error', err);
         Object.assign(resMetadata, { error: err });
         this.stateMachine.setState('failed');
      } finally {
         await this.storage.close();
      }
      return new Promise((resolve, reject) => {
         if ("error" in resMetadata) reject(resMetadata.error);
         resolve(resMetadata);
      });
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