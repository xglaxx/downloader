#!/usr/bin/env node
import Downloader from "./index.js";
const pross = process.argv;
const url = (pross[2] || "");
const output = (pross[3] || "./tmp/"+Date.now());
(async () => {
   if (!/https:\/\//.test(url)) throw new Error("Isso não é uma url: "+url);
   
   const job = Downloader({ url, output });
   job.on("progress", ({ percent, eta, speed }) => {
      job.logsConsole(`Progresso: ${percent}% | ETA: ${eta.toFixed(1)}s | Velocidade: ${(speed / 1024 / 1024).toFixed(2)} MB/s `);
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