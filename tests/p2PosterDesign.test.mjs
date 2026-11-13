import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  DESIGN_STYLES,POSTER_FORMATS,newPosterBlueprint,
  parsePosterBlueprint,scalePosterBlueprint,
} from '../lib/marketing/poster-design.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('P2-04 produces original square/portrait/story editable text layers',()=>{
  assert.deepEqual(Object.keys(POSTER_FORMATS),['square','portrait','story']);
  assert.deepEqual(Object.values(POSTER_FORMATS).map(x=>[x.width,x.height]),
    [[1080,1080],[1080,1350],[1080,1920]]);
  assert.equal(DESIGN_STYLES.length,4);
  for(const format of Object.keys(POSTER_FORMATS)){
    const draft=newPosterBlueprint('ஜாஃப்னா வணிகம்',format);
    assert.equal(parsePosterBlueprint(draft)?.layers[0].id,'business');
    assert.deepEqual(draft.layers.map(x=>x.id),['business','headline','price','date','cta','phone']);
    assert.ok(draft.layers.every(l=>typeof l.value==='string'&&l.x>=0&&l.fontSize>=16));
  }
});
test('text layers can be edited, JSON-exported, safely restored and scaled',()=>{
  const original=newPosterBlueprint('Brand', 'square');
  original.layers[1].value='விலை LKR 1,250';
  const restored=parsePosterBlueprint(JSON.parse(JSON.stringify(original)));
  assert.ok(restored);
  assert.equal(restored?.layers[1].value,'விலை LKR 1,250');
  const story=scalePosterBlueprint(original,'story');
  assert.equal(story.format,'story');
  assert.equal(story.layers[1].y,Math.round(original.layers[1].y*1920/1080));
  assert.equal(story.layers[1].x,original.layers[1].x);
  assert.equal(original.format,'square');
});
test('import rejects malicious or oversize project text',()=>{
  const x=newPosterBlueprint('Brand');
  for(const altered of [
    {...x,version:2},{...x,format:'2k-free'},
    {...x,background:'url(javascript:alert(1))'},
    {...x,layers:[...x.layers,{...x.layers[0]}]},
    {...x,layers:x.layers.map(l=>l.id==='phone'?{...l,fontSize:900}:l)},
    {...x,layers:x.layers.map(l=>l.id==='price'?{...l,value:'A'.repeat(251)}:l)},
    {...x,layers:x.layers.map(l=>l.id==='date'?{...l,x:-100}:l)},
    {...x,layers:x.layers.map(l=>l.id==='date'?{...l,y:5000}:l)},
  ])assert.equal(parsePosterBlueprint(altered),null);
});
test('Design Editor actually draws independent Canvas text and exports PNG',()=>{
  const s=read('app/vendor/marketing/design/page.tsx');
  assert.match(s,/drawPoster\(/);
  assert.match(s,/c\.fillText\(/);
  assert.match(s,/onPointerDown=\{onDown\}/);
  assert.match(s,/onPointerMove=\{onMove\}/);
  assert.match(s,/document\.fonts\.ready/);
  assert.match(s,/c\.toBlob\(resolve,'image\/png'\)/);
  assert.match(s,/parsePosterBlueprint\(input\)/);
  assert.match(s,/image\/png,image\/jpeg,image\/webp/);
  assert.match(s,/3\*1024\*1024/);
  assert.doesNotMatch(s,/AI-generated background successfully created/);
  const homepage=read('app/vendor/marketing/page.tsx');
  assert.match(homepage,/href:'\/vendor\/marketing\/design'/);
});
