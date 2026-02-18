export default class Scheduler {
   constructor({ segments, workerFactory, concurrency }) {
      this.segments = segments;
      this.workerFactory = workerFactory;
      this.concurrency = concurrency;
   }
   
   async start() {
      const queue = [...this.segments];
      const active = new Set();
      const runNext = async () => {
         if (queue.length === 0) return;
         
         const segment = queue.shift();
         const worker = this.workerFactory(segment);
         const p = worker.run().finally(() => {
            active.delete(p);
         });
         active.add(p);
         if (active.size >= this.concurrency) {
            await Promise.race(active);
         }
         
         await runNext();
      };
      
      await runNext();
      await Promise.all(active);
   }
}