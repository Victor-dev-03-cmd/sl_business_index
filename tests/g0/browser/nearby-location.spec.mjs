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

test('GPS permission grants an accurate synthetic fix across engines',async({page,context},testInfo)=>{
  test.setTimeout(45_000);
  await context.grantPermissions(['geolocation'],{origin:'http://127.0.0.1:3098'});
  await context.setGeolocation({latitude:8.756,longitude:80.496,accuracy:48});
  await page.goto('/nearby',{waitUntil:'domcontentloaded'});
  const button=page.locator('[data-nearby-action="locate"]');
  await expect(button).toBeVisible();
  const enabled=await button.isEnabled();
  if(enabled) await button.click();
  await page.waitForTimeout(2200);
  const diagnostics=await page.evaluate(async()=>{
    let permission='unsupported';
    try {permission=(await navigator.permissions.query({name:'geolocation'})).state;} catch {}
    return {
      secure:window.isSecureContext,
      hasGeolocation:!!navigator.geolocation,
      permission,
      pending:document.querySelector('[data-nearby-action="locate"]')?.disabled,
      notice:document.querySelector('[data-nearby-location-status]')?.textContent?.slice(0,220)||'',
      currentArea:document.querySelector('[aria-label="Choose district or town"]')?.textContent?.slice(0,110)||'',
    };
  });
  console.log('Synthetic GPS '+testInfo.project.name+': '+JSON.stringify({buttonEnabled:enabled,...diagnostics}));
  await expect(page.getByText(/GPS location · ±48 m/).first()).toBeVisible({timeout:30000});
  await expect(page.getByText(/GPS confirmed.*selected.*radius/).first()).toBeVisible();
  await expect(page.getByText('Colombo · Starting area')).toHaveCount(0);
});
