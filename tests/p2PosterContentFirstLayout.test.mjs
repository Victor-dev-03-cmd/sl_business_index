import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  planPosterContactRows,planStackedCard,
} from '../lib/marketing/puter-adaptive-card-layout.ts';
import {POSTER_FONT_PAIRS} from '../lib/marketing/poster-design-blueprint.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const renderer=read('lib/marketing/puter-premium-poster-renderer.ts');
const brain=read('lib/marketing/poster-gemini-design-blueprint.ts');
const composer=read('lib/marketing/puter-poster-composer.ts');
const presets=read('lib/marketing/poster-premium-presets.ts');

test('website + phone appear side-by-side; verified email becomes full second contact row',()=>{
  const rows=planPosterContactRows({
    website:'https://laxsan-dev.vercel.app/',
    phone:'0769200572',email:'laxsan732@gmail.com',
  });
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(row=>row.map(cell=>cell.kind)),
    [['globe','phone'],['mail']]);
  assert.equal(rows[0][0].text,'https://laxsan-dev.vercel.app/');
  assert.equal(rows[0][1].text,'0769200572');
  assert.equal(rows[1][0].text,'laxsan732@gmail.com');
  assert.equal(rows[0].reduce((sum,cell)=>sum+cell.share,0),1);
});

test('WITHOUT website, phone and email use the SAME horizontal row',()=>{
  for(const website of ['',undefined,'  ']){
    const rows=planPosterContactRows({
      website,phone:'0769200572',email:'laxsan732@gmail.com',
    });
    assert.equal(rows.length,1);
    assert.deepEqual(rows[0].map(cell=>cell.kind),['phone','mail']);
    assert.equal(rows[0].reduce((sum,cell)=>sum+cell.share,0),1);
    assert.equal(rows[0][0].text,'0769200572');
    assert.equal(rows[0][1].text,'laxsan732@gmail.com');
  }
  assert.deepEqual(planPosterContactRows({website:'',phone:'',email:''}),[]);
  assert.deepEqual(planPosterContactRows({phone:'0770000000'}).map(row=>row.map(c=>c.kind)),[['phone']]);
  assert.deepEqual(planPosterContactRows({website:'https://example.com',email:'a@b.lk'}).map(row=>row.map(c=>c.kind)),[['globe','mail']]);
});

test('the main business card grows, rises and keeps contacts inside the poster safe area',()=>{
  const example={format:'story',canvasHeight:1920,scale:1,
    brandHeight:61,offerHeight:221,serviceHeight:57,
    hasCta:true,contactRows:2};
  const normal=planStackedCard(example);
  const focus=planStackedCard({...example,contentFocus:true});
  assert.ok(focus.top<normal.top,'elevated card starts earlier');
  assert.ok(focus.bottom<normal.bottom,'content card ends farther above bottom edge');
  assert.ok(focus.height>normal.height,'larger card allows legible content');
  assert.ok(focus.top>1920*.43&&focus.top<1920*.65,'the main hero remains visible');
  assert.ok(focus.ctaHeight>normal.ctaHeight);
  assert.ok(focus.contactsY!==null&&focus.contactsY+focus.contactsHeight<=focus.bottom);
  assert.ok(focus.ctaY!==null&&focus.offerY!==null&&focus.ctaY>focus.offerY);
  for(const [format,height] of [['square',1080],['portrait',1350],['story',1920]]){
    const scale=height/1920;
    const rows=planPosterContactRows({phone:'0771000000',email:'owner@shop.lk'}).length;
    const plan=planStackedCard({format,canvasHeight:height,scale,
      brandHeight:50*scale,offerHeight:194*scale,
      serviceHeight:46*scale,hasCta:true,contactRows:rows,contentFocus:true});
    assert.ok(plan.top>0&&plan.bottom<height*.95,format);
    assert.ok(plan.contactsY!==null&&plan.contactsY+plan.contactsHeight<=plan.bottom,format);
  }
});

test('Canvas renderer keeps existing typography, makes lower text larger, and draws legible contact chips',()=>{
  assert.match(renderer,/const contactRows=planPosterContactRows\(copy\)\.length/);
  assert.match(renderer,/contentFocus:true/);
  assert.match(renderer,/rows=planPosterContactRows\(p\.copy\)/);
  assert.match(renderer,/roundedPath\(ctx,left,y,width,slotH/);
  assert.match(renderer,/contactIcon\(ctx,item\.kind/);
  assert.match(renderer,/label:'Verified '\+item\.kind/);
  assert.match(renderer,/const titleMax=h\*\(format==='square'\?\.26:\.27\)/);
  assert.match(renderer,/displayLanguage==='ta'\?96/);
  assert.match(renderer,/start:\(focus\?83:110\)\*scale/);
  assert.match(renderer,/start:52\*scale/);
  assert.match(renderer,/start:\(focus\?35:44\)\*scale/);
  assert.match(renderer,/const buttonW=Math\.min\(panelW\*\.84,800\*scale\)/);
  assert.match(renderer,/start:40\*p\.scale/);
  assert.match(renderer,/p\.language==='ta'&&p\.role==='offer'/);
  assert.deepEqual(POSTER_FONT_PAIRS.ta.map(x=>[x.headlineFont,x.bodyFont]),
    [['Pavanam','Pavanam']]);
  assert.deepEqual(POSTER_FONT_PAIRS.si.map(x=>[x.headlineFont,x.bodyFont]),
    [['Gemunu Libre','Maname']]);
});

test('Gemini and image model directions describe the REFERENCE content hierarchy without inventing text',()=>{
  assert.match(brain,/CONTENT FIRST HIERARCHY/);
  assert.match(brain,/phone and email share ONE row/);
  assert.match(brain,/LOWER ~56%-93%/);
  assert.match(brain,/the real business offer/);
  assert.match(composer,/CONTENT-FIRST premium editorial poster/);
  assert.match(composer,/CENTRAL 19–58%/);
  assert.match(composer,/adaptive COMPACT card/);
  assert.match(composer,/AI returns ART ONLY/);
  assert.match(presets,/LARGE content-first adaptive glass card/);
  assert.match(presets,/Luxurious Deepavali night/);
  assert.match(brain,/Do not invent prices, discounts, percentages/);
  assert.match(composer,/STRICT: NO TEXT of any kind in the AI artwork/);
});
