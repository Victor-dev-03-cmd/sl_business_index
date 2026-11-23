// G0-09 browser-engine emulation: no real identity, provider, Supabase or production URL.
// Browser QA is NOT physical-device acceptance or authenticated vendor/admin E2E.
import {test,expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  // Never send test requests to an external provider or a real production project.
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:3098/') || url.startsWith('data:') || url.startsWith('blob:')) {
      await route.continue();
    } else {
      await route.abort('blockedbyclient');
    }
  });
});

test('anonymous vendor and admin pages redirect to safe sign-in', async ({page}) => {
  for (const destination of ['/vendor/dashboard', '/admin/dashboard', '/register-business']) {
    await page.goto(destination, {waitUntil: 'domcontentloaded'});
    await expect(page).toHaveURL(url => {
      const u = new URL(url);
      return u.pathname === '/login' && u.searchParams.get('next') === destination;
    });
    await expect(page.getByRole('heading',{name: 'Sign in to your account'})).toBeVisible();
    const url = new URL(page.url());
    expect(url.origin).toBe('http://127.0.0.1:3098');
  }
});

test('sign-in options are usable and email form remains local', async ({page, isMobile}) => {
  await page.goto('/login', {waitUntil: 'domcontentloaded'});
  const google=page.getByRole('button',{name:'Continue with Google'});
  const passkey=page.getByRole('button',{name:'Continue with Passkey'});
  const email=page.getByRole('button',{name:'Continue with Email'});
  await expect(google).toBeVisible();
  await expect(passkey).toBeVisible();
  await expect(email).toBeVisible();
  await email.click();
  await expect(page.getByRole('textbox',{name:'Email address'})).toBeVisible();
  await page.getByRole('textbox',{name:'Email address'}).fill('synthetic@testing.invalid');
  await expect(page.locator('input[name="password"]')).toHaveAttribute('type','password');
  await page.getByRole('button',{name:'Show password'}).click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Hide password'}).click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute('type','password');
  await page.getByRole('button',{name:'All sign-in options'}).click();
  await expect(email).toBeVisible();
  if(isMobile) {
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow,'mobile login must not overflow viewport').toBeLessThanOrEqual(2);
  }
});

test('signup flow and URL navigation are accessible', async ({page}) => {
  await page.goto('/signup', {waitUntil: 'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
  await page.getByRole('button',{name:'Continue with Email'}).click();
  await expect(page.locator('input[name="name"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await page.getByRole('button',{name:'All sign-in options'}).click();
  await page.getByRole('link',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading',{name:'Sign in to your account'})).toBeVisible();
});
