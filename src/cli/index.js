#!/usr/bin/env node
import DownloadJob from '../core/DownloadJob.js';
import FileStorage from '../adapters/FileStorage.js';
import RetryPolicy from '../policies/RetryPolicy.js';
import FileChanging from '../adapters/FileChanging.js';
import HttpDataSource from '../adapters/HttpDataSource.js';
import integrityValidator from '../core/IntegrityValidator.js';
import FileMetadataStore from '../adapters/FileMetadataStore.js';
const renameChaning = new FileChanging(output);
const Downloader = ({ url, output, retryPolicy = 1, concurrency = 3 }) => new DownloadJob({
   output,
   concurrency,
   rename: renameChaning,
   segmentSize: (1024 * 1024),
   dataSource: new HttpDataSource(url),
   retryPolicy: new RetryPolicy(retryPolicy),
   metadataStore: new FileMetadataStore(output),
   integrityValidator: new integrityValidator(output),
   storage: new FileStorage({
      path: output,
      rename: renameChaning
   })
});
export default Downloader;