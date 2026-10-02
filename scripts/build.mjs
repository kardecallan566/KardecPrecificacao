import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await copyFile('index.html','dist/index.html');await cp('assets','dist/assets',{recursive:true});await cp('admin','dist/admin',{recursive:true});await copyFile('server/pricing.js','dist/assets/pricing.js');await copyFile('_headers','dist/_headers');await copyFile('_redirects','dist/_redirects');
console.log('Static Pages assets built to dist/');
