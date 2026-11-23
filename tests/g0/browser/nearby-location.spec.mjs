// Browser GPS is mocked in Playwright; no real device or location permission used.
import {test,expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.route('**/*',async route => {
    const url=route.request().url();
    if(url.startsWith('http://127.0.0.1:3098/')||url.startsWith('data:')||url.startsWith('blob:'))
      await route.continue();
    else await route.abort('blockedbyclient');
  });
});

test('unknown GPS does not impersonate Colombo; first visit presents explicit choice',async({page})=>{
  await page.goto('/nearby',{waitUntil:'domcontentloaded'});
  await expect(page.getByText('Sri Lanka · Choose your area').first()).toBeVisible();
  await expect(page.getByText('Colombo · Starting area')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Use my location'}).first()).toBeVisible();
  await expect(page.getByText('Location not set. Use GPS to find businesses near you, or choose a town.')).toBeVisible();
});

test('user tap applies an accurate synthetic GPS fix across engines',async({page,context},testInfo)=>{
  // GitHub headless WebKit's native location provider remained pending
  // despite grantPermissions; explicitly inject a provider response there.
  // Chromium exercises Playwright's browser-level GPS mock. Neither is a
  // physical iPhone/Android positioning test.
  if(testInfo.project.name==='ios-webkit'){
    await page.addInitScript(()=>{
      Object.defineProperty(navigator,'geolocation',{
        configurable:true,
        value:{
          getCurrentPosition:(success)=>{
            setTimeout(()=>success({
              coords:{latitude:8.756,longitude:80.496,accuracy:48},
              timestamp:Date.now(),
            }),20);
          },
          watchPosition:()=>1,
          clearWatch:()=>{},
        },
      });
    });
  } else {
    await context.grantPermissions(['geolocation'],{origin:'http://127.0.0.1:3098'});
    await context.setGeolocation({latitude:8.756,longitude:80.496,accuracy:48});
  }
  await page.goto('/nearby',{waitUntil:'domcontentloaded'});
  const button=page.locator('[data-nearby-action="locate"]');
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click(); // Native permission requests must originate on a tap.
  await expect(page.getByText(/GPS location · ±48 m/).first()).toBeVisible({timeout:12000});
  await expect(page.getByText(/GPS confirmed.*selected.*radius/).first()).toBeVisible();
  await expect(page.getByText('Colombo · Starting area')).toHaveCount(0);
});


// Browser-provider callbacks are deterministic mocks, not a physical GPS sensor.
// Clicking Enter is the user gesture that requests location on the first visit.
test('Home Hero Enter obtains fresh GPS before carrying search query to Nearby',async({page},testInfo)=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
      getCurrentPosition:(onSuccess)=>setTimeout(()=>onSuccess({
        coords:{latitude:8.755,longitude:80.497,accuracy:35},
        timestamp:Date.now(),
      }),20),
      watchPosition:()=>1,clearWatch:()=>{},
    }});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const id=testInfo.project.name==='desktop-chromium'?'hero-business-query':'mobile-home-business-query';
  const input=page.locator('#'+id);
  await expect(input).toBeVisible();
  await input.fill('Electrician');
  await input.press('Enter');
  await expect(page).toHaveURL(url=>{
    const u=new URL(url);
    return u.pathname==='/nearby'
      && (u.searchParams.get('q')||'').toLowerCase().includes('electrician')
      && u.searchParams.get('lat')==='8.755'
      && u.searchParams.get('lng')==='80.497'
      && u.searchParams.get('radius')==='5000'
      && u.searchParams.get('source')==='gps';
  },{timeout:20000});
  await expect(page.getByText('Location from recent GPS search').first()).toBeVisible();
});

test('Hero search fails visibly on denied GPS; never fabricates Colombo or drops query',async({page},testInfo)=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
      getCurrentPosition:(_success,onError)=>setTimeout(()=>onError({
        code:1,message:'denied',PERMISSION_DENIED:1,
      }),20),
    }});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const id=testInfo.project.name==='desktop-chromium'?'hero-business-query':'mobile-home-business-query';
  const input=page.locator('#'+id);
  await expect(input).toBeVisible();
  await input.fill('Hospital');
  await input.press('Enter');
  await expect(page.getByText(/Location permission is blocked/).first()).toBeVisible({timeout:15000});
  expect(new URL(page.url()).pathname).toBe('/');
  await expect(input).toHaveValue('Hospital');
});


test('Hotel in Colombo uses the requested city instead of asking for device GPS',async({page},testInfo)=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
      getCurrentPosition:(_ok,err)=>setTimeout(()=>err({code:1,message:'GPS should not be called for explicit city'}),20)
    }});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const input=page.locator(testInfo.project.name==='desktop-chromium'?'#hero-business-query':'#mobile-home-business-query');
  await expect(input).toBeVisible();
  await input.fill('Hotels in Colombo');
  await input.press('Enter');
  await expect(page).toHaveURL(url=>{
    const parsed=new URL(url);
    return parsed.pathname==='/nearby'
      && parsed.searchParams.get('source')!=='gps'
      && (parsed.searchParams.get('town')?.toLowerCase()==='colombo'
          || parsed.searchParams.get('district')?.toLowerCase()==='colombo')
      && (parsed.searchParams.get('q')||'').toLowerCase().includes('hotel');
  },{timeout:20000});
  await expect(page.getByText(/Location permission is blocked/)).toHaveCount(0);
});

test('explicit Jaffna locality preserves query scope with GPS unavailable',async({page},testInfo)=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
      getCurrentPosition:(_ok,err)=>setTimeout(()=>err({code:1,message:'test disabled'}),20)
    }});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  const input=page.locator(testInfo.project.name==='desktop-chromium'?'#hero-business-query':'#mobile-home-business-query');
  await input.fill('Restaurant in Jaffna');
  await input.press('Enter');
  await expect(page).toHaveURL(url=>{
    const parsed=new URL(url);
    return parsed.pathname==='/nearby'
      && parsed.searchParams.get('source')!=='gps'
      && (parsed.searchParams.get('town')?.toLowerCase()==='jaffna'
          || parsed.searchParams.get('district')?.toLowerCase()==='jaffna')
      && /restaurant|food/.test((parsed.searchParams.get('q')||'').toLowerCase());
  },{timeout:20000});
});
