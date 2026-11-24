import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
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


test('active Poster Studio is the sole production page; no retired Creative AI DOM can flash',()=>{

  assert.equal(existsSync(new URL('../app/vendor/marketing/design/page.tsx',import.meta.url)),false);
  const config=read('next.config.ts');
  assert.match(config,/source: '\/vendor\/marketing\/design'/);
  assert.match(config,/destination: '\/vendor\/marketing\/design\/puter-lab'/);
  const catalog=read('lib/marketing/studio-apps.ts');
  assert.match(catalog,/href:'\/vendor\/marketing\/design\/puter-lab'/);
  assert.doesNotMatch(catalog,/href:'\/vendor\/marketing\/design',/);
});
test('one active Studio uses Gemini, Puter, exact Canvas and multilingual review',()=>{
  const ui=read('app/vendor/marketing/design/puter-lab/page.tsx');
  const composer=read('lib/marketing/puter-poster-composer.ts');
  const voice=read('lib/marketing/voice/slbi-voice-engine.ts');
  assert.match(ui,/SLBI AI Poster Studio/);
  assert.match(ui,/id="puter-prompt"/);
  assert.match(voice,/getUserMedia/);
  assert.match(voice,/MediaRecorder/);
  assert.match(ui,/new SlbiVoiceRecorder/);
  assert.match(voice,/\/api\/marketing\/poster\/transcribe/);
  assert.match(ui,/Prepare with Gemini/);
  assert.match(ui,/CONTENT_PANEL_STYLES\.map/);
  assert.match(ui,/composeExactPoster/);
  assert.match(ui,/puter\.ai\.txt2img/);
  assert.match(composer,/renderPremiumPoster/);
  assert.match(ui,/realMode&&!consent/);
  const planner=read('app/vendor/marketing/campaigns/page.tsx');
  assert.match(planner,/style=\{dropdownArrow\}/);
  assert.match(planner,/value=\{language\} onChange=\{e=>setLanguage\(/);
  assert.match(planner,/helper\.free/);
  assert.doesNotMatch(planner,/dropdownArrowOnDark/);
});
test('approved poster image is never fictional and final PNG remains local and precise',()=>{
  const ui=read('app/vendor/marketing/design/puter-lab/page.tsx');
  const composer=read('lib/marketing/puter-poster-composer.ts');
  assert.match(ui,/isPosterCopyInLanguage/);
  assert.match(ui,/review.*headline/i);
  assert.match(ui,/finalBlob/);
  assert.match(ui,/anchor\.download/);
  assert.match(ui,/Preview poster sample/);
  assert.match(composer,/canvas\.width=d\.width;canvas\.height=d\.height/);
  assert.match(composer,/canvas\.toBlob/);
  assert.doesNotMatch(ui,/drawPoster\(|EditableTextLayer|Your manual poster editor/);
});
