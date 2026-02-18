#!/usr/bin/env node
import Downloader from "./index.js";
const pross = process.argv;
const url = (pross[2] || "");
const output = (pross[3] || "");
(async () => {
   if (!/https:\/\//.test(url)) throw url;
   
   const job = Downloader({ url, output: (output || "./tmp/"+Date.now()) });
   job.on("progress", ({ percent, eta, speed }) => {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`Progresso: ${percent}% | ETA: ${eta.toFixed(1)}s | Velocidade: ${(speed / 1024 / 1024).toFixed(2)} MB/s `);
   });
   job.on("completed", (data) => {
      console.warn("\nDownload Concluido:", data);
   });
   job.on("error", (err) => {
      console.warn("\nDownload Não foi concluído:", err);
   });
   await job.start();
   process.exit();
})();