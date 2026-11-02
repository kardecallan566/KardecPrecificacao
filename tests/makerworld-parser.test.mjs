import test from 'node:test';
import assert from 'node:assert/strict';
import {extractMakerWorldTooltip} from '../assets/makerworld-parser.js';

test('extrai gramas e horas do tooltip',()=>{const html='<div class="profile_detail"><span>5.7 h</span></div><div class="filaments_detail"><span class="material-text">PLA</span><span class="weight-text">78 g</span></div>';const r=extractMakerWorldTooltip(html);assert.equal(r.grams,78);assert.equal(r.hours,5.7);assert.equal(r.material,'PLA');});
test('retorna erro sem dados',()=>assert.throws(()=>extractMakerWorldTooltip('<div>vazio</div>'),/Não encontrei peso/));
