export default class RetryPolicy {
   constructor(maxRetries = 3) {
      this.maxRetries = maxRetries;
   }
   
   async execute(fn) {
      let attempt = 0;
      while (attempt <= this.maxRetries) {
         try {
            return await fn();
         } catch (err) {
            if (attempt >= this.maxRetries) throw err;
            const delay = 2 ** attempt * 1000;
            await new Promise(r => setTimeout(r, delay));
            attempt++;
         }
      }
   }
}