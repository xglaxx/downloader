import fs from 'fs';
import path from "path";
import { fileTypeFromFile, supportedExtensions } from 'file-type';
export default class FileChanging {
   constructor(file) {
      this.path = file;
   }
   
   isExist(file = this.path) {
      return (file && fs.existsSync(file) ? true : false);
   }
   
   readjustmentName(name) {
      return (Number(name) ? name : name?.replace(/á|â|ã|à|ä/g, 'a').replace(/Á|Â|Ã|À|Ä/g, 'A').replace(/ć|ç|č/g, 'c').replace(/Ć|Ç|Č/g, 'C').replace(/é|ê|è|ë/g, 'e').replace(/É|Ê|È|Ë/g, 'E').replace(/í|î|ì|ï/g, 'i').replace(/Í|Î|Ì|Ï/g, 'I').replace(/ó|õ|ô|ò|ö/g, 'o').replace(/Ó|Õ|Ô|Ò|Ö/g, 'O').replace(/ú|û|ù|ü/g, 'u').replace(/Ú|Û|Ù|Ü/g, 'U').replace(/\t|\s/g, '_').replace(/[^a-zA-Z0-9-+_().]+/g, '-').replaceAll(' ', '_').replaceAll('/', '-').replaceAll(`\\`, '-').trim());
   }
   
   bytesToSize(pBytes) {
      if (pBytes <= 1) return pBytes+' Bytes';
      var bytes = Math.abs(pBytes), orderOfMagnitude = Math.pow(10, 3), abbreviations = [ 'Bytes', 'kB', 'MB', 'GB', 'TB','PB', 'EB', 'ZB', 'YB' ];
      var i = Math.floor(Math.log(bytes) / Math.log(orderOfMagnitude));
      var result = (bytes / Math.pow(orderOfMagnitude, i));
      if (pBytes < 0) result *= -1;
      if (result >= 99.995 || i == 0) return result.toFixed(0) + ' ' + abbreviations[i];
      
      return result.toFixed(2) + ' ' + abbreviations[i];
   }
   
   sizeBytesFile(file = this.path) {
      const data = (this.isExist(file) ? fs.lstatSync(file): {});
      return Object.assign(data, {
         size: this.bytesToSize(data.size || 0),
         sizeBytes: (data.size || 0)
      });
   }
   
   async readjustFile(file = this.path) {
      let newName = null;
      const isFile = this.isExist(file);
      if (isFile) {
         const type = await fileTypeFromFile(file);
         let ext = file.split('.').pop();
         if (ext !== type.ext) {
            if (!supportedExtensions.has(ext)) {
               newName = file+"."+type.ext;
            } else {
               const pasta = file.replaceAll(path.basename(file), '');
               const fileName = this.readjustmentName(path.basename(file, '.'+ext));
               newName = pasta+fileName+"."+type.ext;
            }
            if (newName) {
               await fs.promises.rename(file, newName);
               file = newName;
            }
         }
      }
      return file;
   }
   
   async changeFileName(newName, dir = this.path) {
      const isFile = this.isExist(newName);
      const isDir = this.isExist(dir);
      if (!isFile) {
         if (isDir) {
            await fs.promises.rename(dir, newName);
         }
      }
      return newName;
   }
   
   paste(dir, deletePaste) {
      const { pasta } = this.extractExt(dir);
      if (pasta === './') return './';
      
      const folderInfo = this.isExist(pasta) && fs.statSync(pasta);
      if (folderInfo) {
         if (!folderInfo?.isDirectory()) return !0;
         if (deletePaste) fs.rmSync(pasta, { recursive: true, force: true });
      } else {
         fs.mkdirSync(pasta, { recursive: true });
      }
      return pasta;
   }
   
   reName(directory = this.path, createPaste = false) {
      const { pasta, file } = this.extractExt(directory);
      if (createPaste) this.paste(pasta);
   
      return pasta+this.readjustmentName(file);
   }
   
   extractExt(file = this.path) {
      const spOrSDt = file.startsWith('./') || file.startsWith('/data/data/') || file.startsWith('/root/');
      if (!spOrSDt) file = './'+file;
      
      const pasta = file.endsWith('/') ? file : file.replaceAll(path.basename(file), '');
      let ext = file.split('.').pop();
      if (supportedExtensions.has(ext)) {
         file = path.basename(file, '.'+ext);
      } else {
         ext = '';
      }
      file = this.readjustmentName(path.basename(file));
      const newFile = pasta+file+(ext ? '.'+ext: '');
      const vfStat = (this.isExist(newFile) ? fs.statSync(newFile): false);
      return {
         pasta,
         file,
         newFile,
         ext,
         existFile: Boolean(vfStat),
         stat: (vfStat || {})
      };
   }
}