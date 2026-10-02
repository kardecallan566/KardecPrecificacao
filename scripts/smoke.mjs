import {readdir,readFile,stat} from 'node:fs/promises';
async function files(root){let result=[];for(const item of await readdir(root)){const p=root+'/'+item,s=await stat(p);if(s.isDirectory())result.push(...await files(p));else result.push(p)}return result;}
for(const file of await files('functions')){if(!file.endsWith('.js'))continue;const src=await readFile(file,'utf8');if(!src.includes('onRequest'))throw Error(file+' missing onRequest');}
console.log('Pages Functions handlers found');
