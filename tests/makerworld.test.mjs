import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupModel,extractPrintEstimate} from '../server/makerworld.js';

test('MakerWorld: identifica o modelo, extrai a capa e usa somente o perfil selecionado',async()=>{
 const payload={data:{title:'Suporte articulado',designCreator:{name:'Maker'},cover:{url:'https://makerworld.com/cover.jpg'},license:'CC BY-NC',instances:[
  {profileId:111,title:'Perfil antigo',weight:20,prediction:3600},
  {profileId:222,title:'PETG 0.20',weight:84.5,prediction:9000}
 ]}};
 const result=await lookupModel('https://makerworld.com/pt/models/123456-suporte#profileId-222',async()=>({ok:true,text:async()=>JSON.stringify(payload)}));
 assert.equal(result.title,'Suporte articulado');
 assert.equal(result.designer,'Maker');
 assert.equal(result.profileName,'PETG 0.20');
 assert.equal(result.grams,84.5);
 assert.equal(result.hours,2.5);
 assert.equal(result.imageUrl,'https://makerworld.com/cover.jpg');
 assert.match(result.modelPreviewUrl,/models\/123456$/);
 assert.match(result.note,/Bambu Studio/);
 assert.doesNotMatch(result.note,/licença|license/i);
});

test('MakerWorld: não inventa peso ou tempo quando o perfil não está disponível',async()=>{
 const result=await lookupModel('https://makerworld.com/en/models/654321-model#profileId-999',async()=>({ok:true,text:async()=>JSON.stringify({data:{title:'Modelo',instances:[{profileId:1,weight:30,prediction:3600}]}})}));
 assert.equal(result.grams,null);
 assert.equal(result.hours,null);
 assert.match(result.note,/Nenhum valor será inventado/);
});

test('estimativa do perfil rejeita valores ausentes, zero ou fora do limite',()=>{
 assert.deepEqual(extractPrintEstimate({weight:0,prediction:-10}),{grams:null,hours:null});
});
