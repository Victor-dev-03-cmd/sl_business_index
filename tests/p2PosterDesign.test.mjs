import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  DESIGN_STYLES,POSTER_FORMATS,newPosterBlueprint,
  parsePosterBlueprint,scalePosterBlueprint,
} from '../lib/marketing/poster-design.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('P2-04 supports four social-ready aspect ratios with editable text layers',()=>{
  assert.deepEqual(Object.keys(POSTER_FORMATS),['square','portrait','story','landscape']);
  assert.deepEqual(Object.values(POSTER_FORMATS).map(x=>[x.width,x.height]),
    [[1080,1080],[1080,1350],[1080,1920],[1200,630]]);
  assert.equal(DESIGN_STYLES.length,4);
  for(const format of Object.keys(POSTER_FORMATS)){
    const draft=newPosterBlueprint('ஜாஃப்னா வணிகம்',format);
    assert.equal(parsePosterBlueprint(draft)?.layers[0].id,'business');
    assert.deepEqual(draft.layers.map(x=>x.id),['business','headline','price','date','cta','phone']);
    assert.ok(draft.layers.every(l=>typeof l.value==='string'&&l.x>=0&&l.fontSize>=16));
    assert.ok(draft.layers.every(l=>l.x<=POSTER_FORMATS[format].width&&l.y<=POSTER_FORMATS[format].height));
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
    {...x,format:'landscape',layers:x.layers.map(l=>l.id==='date'?{...l,y:700}:l)},
    {...x,format:'landscape',layers:x.layers.map(l=>l.id==='price'?{...l,x:1300}:l)},
  ])assert.equal(parsePosterBlueprint(altered),null);
});

test('vendor Poster Studio uses a single natural language prompt, not a manual graphic editor',()=>{
  const ui=read('app/vendor/marketing/design/page.tsx');
  assert.match(ui,/What poster shall we create today\?/);
  assert.match(ui,/id="creative-prompt"/);
  assert.match(ui,/Generate AI poster/);
  assert.match(ui,/aria-label="Try an idea"/);
  assert.match(ui,/webkitSpeechRecognition/);
  assert.match(ui,/ta-LK/);
  assert.match(ui,/si-LK/);
  assert.match(ui,/en-LK/);
  assert.match(ui,/POSTER_FORMATS|formatNames/);
  assert.doesNotMatch(ui,/drawPoster\(|onPointerDown|onPointerMove|EditableTextLayer|parsePosterBlueprint|createSimpleDraft/);
  assert.match(read('app/vendor/marketing/campaigns/page.tsx'),/dropdownArrowOnDark/);
});
test('AI poster appears only after verified private image bytes, then accepts edit instructions',()=>{
  const ui=read('app/vendor/marketing/design/page.tsx');
  assert.match(ui,/await openArtwork\(result\.jobId\)/);
  assert.match(ui,/\/api\/marketing\/poster\/artwork\?jobId=/);
  assert.match(ui,/result\.error/);
  assert.match(ui,/refine\?\{/);
  assert.match(ui,/sourceJobId/);
  assert.match(ui,/editInstruction/);
  assert.match(ui,/Edit this image with AI/);
  assert.match(ui,/Your recent AI posters/);
  assert.match(ui,/Download PNG/);
  assert.match(ui,/Share manually/);
  assert.match(ui,/No fake image will be shown|No fake image|No fake|No manual designer/i);
  assert.doesNotMatch(ui,/Edit design · Advanced controls|Export editable JSON|Drag a text layer|Your manual poster editor/);
});
test('retains Pro-only app routing and honest no-auto-publish claims',()=>{
  const ui=read('app/vendor/marketing/design/page.tsx');
  assert.match(ui,/window\.confirm/);
  assert.match(ui,/\/api\/marketing\/poster\/capabilities/);
  assert.match(ui,/No manual designer/);
  assert.match(ui,/nothing is posted automatically/);
  const homepage=read('app/vendor/marketing/page.tsx');
  assert.match(homepage,/MarketingAppStore/);
  assert.match(read('lib/marketing/studio-apps.ts'),/href:'\/vendor\/marketing\/design'/);
});
