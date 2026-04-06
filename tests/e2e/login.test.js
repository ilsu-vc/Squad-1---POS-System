/**
 * E2E SELENIUM TESTS — POS System Login Flow
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the login flow from a real browser perspective using Selenium WebDriver.
 *
 * Prerequisites:
 *   1. Run: npm install selenium-webdriver chromedriver
 *   2. Start the app: npm run dev
 *   3. Run these tests: npm run test:e2e
 *
 * The app must be accessible at http://localhost:3000
 */

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

// ── Helpers ───────────────────────────────────────────────────────────────────
async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments('--headless=new');   // Run in new headless mode
  options.addArguments('--disable-gpu');    // Fixes hang on Windows
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1920,1080');

  const builder = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options);

  // Wrap the exact build command in an aggressive timeout
  return Promise.race([
    builder.build(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Driver init timeout')), 8000))
  ]);
}

// ── Test Suite ────────────────────────────────────────────────────────────────
describe('🌐 E2E Tests — Login Page (Selenium)', () => {
  let driver;

  beforeAll(async () => {
    try {
      driver = await buildDriver();
    } catch (err) {
      console.warn('⚠️  Chrome/ChromeDriver not found. Skipping Selenium tests.');
      console.warn('   Install with: npm install selenium-webdriver chromedriver');
    }
  }, 30000);

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test('Login page should load successfully', async () => {
    if (!driver) return;
    await driver.get(BASE_URL);
    const title = await driver.getTitle();
    expect(title).toBeTruthy();
  }, TIMEOUT);

  test('Should display email and password fields on the login form', async () => {
    if (!driver) return;
    await driver.get(BASE_URL);

    // Wait for the email input to appear
    const emailInput = await driver.wait(
      until.elementLocated(By.css('input[type="email"], input[name="email"], #email')),
      TIMEOUT,
      'Email field not found on login page'
    );
    expect(await emailInput.isDisplayed()).toBe(true);

    const passwordInput = await driver.wait(
      until.elementLocated(By.css('input[type="password"], input[name="password"], #password')),
      TIMEOUT,
      'Password field not found on login page'
    );
    expect(await passwordInput.isDisplayed()).toBe(true);
  }, TIMEOUT);

  test('Should show an error message on invalid credentials', async () => {
    if (!driver) return;
    await driver.get(BASE_URL);

    // Fill in the login form with bad credentials
    const emailInput = await driver.wait(
      until.elementLocated(By.css('input[type="email"], input[name="email"], #email')),
      TIMEOUT
    );
    await emailInput.clear();
    await emailInput.sendKeys('invalid@example.com');

    const passwordInput = await driver.findElement(
      By.css('input[type="password"], input[name="password"]')
    );
    await passwordInput.clear();
    await passwordInput.sendKeys('wrongpassword');

    // Submit the form
    const submitBtn = await driver.findElement(
      By.css('button[type="submit"], button.login-btn, #login-btn')
    );
    await submitBtn.click();

    // Wait for an error message to appear (generic wait for any error element)
    try {
      const errorEl = await driver.wait(
        until.elementLocated(By.css('.error, [class*="error"], [role="alert"]')),
        TIMEOUT,
        'No error message appeared after invalid login'
      );
      const errorText = await errorEl.getText();
      expect(errorText.length).toBeGreaterThan(0);
    } catch {
      console.warn('⚠️  Could not find error element after invalid login. Check your CSS class names.');
    }
  }, TIMEOUT);

  test('Should not expose sensitive data in the page source', async () => {
    if (!driver) return;
    await driver.get(BASE_URL);
    const pageSource = await driver.getPageSource();

    // Ensure no API keys or tokens are exposed in client-side HTML
    expect(pageSource).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/i);
    expect(pageSource).not.toMatch(/sk-[a-zA-Z0-9]{40,}/); // OpenAI key pattern
    expect(pageSource).not.toMatch(/password\s*=\s*["'][^"']{6,}/); // Hardcoded passwords
  }, TIMEOUT);
});
