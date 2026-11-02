import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('visualizador 3D possui sintaxe JavaScript válida',()=>{
 const result=spawnSync(process.execPath,['--check','assets/model-viewer.js'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout||'Falha ao validar o visualizador 3D');
});
