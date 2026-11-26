// Isolated headless Chromium/WebKit laptop viewport QA — not a physical device test.
import {test,expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.route('**/*',async route=>{
    const url=route.request().url();
    if(url.startsWith('http://127.0.0.1:3098/')||url.startsWith('data:')||url.startsWith('blob:'))
      await route.continue();
    else await route.abort('blockedbyclient');
  });
});

test('small laptop: every industry remains reachable by visible scroll arrows',async({page})=>{
  await page.setViewportSize({width:1024,height:768});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const bar=page.locator('[data-slbi-ui="industry-bar"]');
  const rail=bar.locator('[data-slbi-ui="industry-scroll-track"]');
  await expect(bar).toBeVisible();
  await expect(rail).toBeVisible();
  await expect.poll(()=>rail.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeGreaterThan(50);

  const right=bar.getByRole('button',{name:'Scroll industries right'});
  const left=bar.getByRole('button',{name:'Scroll industries left'});
  await expect(right).toBeVisible();
  await expect(right).toBeEnabled();
  await expect(left).toBeDisabled();

  await right.click();
  await expect.poll(()=>rail.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
  // Arrow keeps moving until the final industry is in the visible portion of
  // the strip; users do not have to guess that there is hidden content.
  for(let i=0;i<8;i++){
    if(!(await right.isEnabled()))break;
    await right.click();
  }
  await expect(right).toBeDisabled({timeout:6000});
  const finalIndustry=rail.getByRole('button',{name:'Retail & Others'});
  await expect(finalIndustry).toBeInViewport({ratio:0.75});
  await finalIndustry.click();
  await expect(page.locator('#industry-mega-menu')).toBeVisible();
  await expect(left).toBeEnabled();

  await left.click();
  await expect.poll(()=>rail.evaluate(el=>el.scrollLeft)).toBeLessThan(
    await rail.evaluate(el=>el.scrollWidth-el.clientWidth),
  );
});

test('mouse wheel on laptop moves ribbon sideways without horizontal document overflow',async({page})=>{
  await page.setViewportSize({width:1100,height:720});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const rail=page.locator('[data-slbi-ui="industry-scroll-track"]');
  await expect(rail).toBeVisible();
  await expect.poll(()=>rail.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeGreaterThan(10);

  const box=await rail.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x+Math.min(170,box.width/3),box.y+box.height/2);
  await page.mouse.wheel(0,280);
  await expect.poll(()=>rail.evaluate(el=>el.scrollLeft)).toBeGreaterThan(30);
  const documentOverflow=await page.evaluate(()=>
    document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(documentOverflow).toBeLessThanOrEqual(2);
});
