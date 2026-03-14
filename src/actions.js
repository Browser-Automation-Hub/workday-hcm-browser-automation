/**
 * actions.js — Core automation actions for Workday HCM
 *
 * Each function accepts a Puppeteer Page instance and options.
 * All actions use retry() + humanDelay() for reliability.
 */
'use strict';

require('dotenv').config();

/**
 * login_workday — Authenticate to Workday with SSO and MFA
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function login_workday(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: login_workday', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      const BASE_URL = process.env.WORKDAY_HCM_URL;
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    // Workday redirects to Okta/Azure SSO
    await page.waitForSelector('#okta-signin-username, input[name="identifier"], input[type="email"]', { timeout: 20000 });
    await page.type('#okta-signin-username, input[name="identifier"]', process.env.WORKDAY_HCM_USERNAME);
    // Okta two-step: username then password
    const nextBtn = await page.$('[data-se="o-form-button-bar"] input, #okta-signin-submit');
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    }
    await page.type('input[type="password"]', process.env.WORKDAY_HCM_PASSWORD);
    await page.click('[data-se="o-form-button-bar"] input, #okta-signin-submit');
    await page.waitForSelector('[data-automation-id="globalNav"], .WD-nav-menu', { timeout: 30000 });
    return { status: 'logged_in' };
    } catch (err) {
      await page.screenshot({ path: `error-login_workday-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

/**
 * run_report — Run and download any Workday report to CSV/XLSX
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function run_report(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: run_report', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      await page.waitForSelector('[data-automation-id="globalSearchInput"]', { timeout: 15000 });
    await page.click('[data-automation-id="globalSearchInput"]');
    await humanDelay(300, 800);
    await page.type('[data-automation-id="globalSearchInput"]', opts.reportName || '');
    await page.waitForSelector('[data-automation-id="searchResult"], [data-automation-id="promptOption"]', { timeout: 10000 });
    await page.click('[data-automation-id="searchResult"]:first-child, [data-automation-id="promptOption"]:first-child');
    await page.waitForSelector('[data-automation-id="wd-CommandButton_uic_exportButton"], [data-automation-id="wd-CommandButton_uic_okButton"]', { timeout: 20000 });
    // Run the report
    const runBtn = await page.$('[data-automation-id="wd-CommandButton_uic_okButton"]');
    if (runBtn) await runBtn.click();
    await page.waitForSelector('[data-automation-id="wd-CommandButton_uic_exportButton"]', { timeout: 30000 });
    await page.click('[data-automation-id="wd-CommandButton_uic_exportButton"]');
    // Select CSV format
    await page.waitForSelector('[data-automation-id="CSV"], [title*="CSV"]', { timeout: 5000 }).catch(() => {});
    const csvOpt = await page.$('[data-automation-id="CSV"], [title*="CSV"]');
    if (csvOpt) await csvOpt.click();
    return { status: 'exported', format: 'csv' };
    } catch (err) {
      await page.screenshot({ path: `error-run_report-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

/**
 * create_absence_request — Submit time-off requests programmatically
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function create_absence_request(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: create_absence_request', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      await page.waitForSelector('[data-automation-id="globalSearchInput"]', { timeout: 15000 });
    await page.type('[data-automation-id="globalSearchInput"]', 'Request Absence');
    await page.waitForSelector('[data-automation-id="searchResult"]', { timeout: 10000 });
    await page.click('[data-automation-id="searchResult"]:first-child');
    await page.waitForSelector('[data-automation-id="singleSelectDropdown"]', { timeout: 15000 });
    // Select absence type
    await page.click('[data-automation-id="singleSelectDropdown"]');
    await page.waitForSelector('[data-automation-id="promptOption"]');
    const typeOpt = await page.evaluateHandle((type) =>
      Array.from(document.querySelectorAll('[data-automation-id="promptOption"]')).find(el => el.textContent.includes(type)),
      opts.absenceType || 'Vacation'
    );
    if (typeOpt) await typeOpt.click();
    // Set dates
    await page.click('[data-automation-id="dateSectionStart-date-input"]');
    await page.keyboard.type(opts.startDate || '');
    await page.click('[data-automation-id="dateSectionEnd-date-input"]');
    await page.keyboard.type(opts.endDate || opts.startDate || '');
    await page.click('[data-automation-id="wd-CommandButton_uic_okButton"]');
    await page.waitForSelector('.WDUI-StatusMessage-positive, [data-automation-id="confirmationMessage"]', { timeout: 20000 }).catch(() => {});
    return { status: 'submitted' };
    } catch (err) {
      await page.screenshot({ path: `error-create_absence_request-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

/**
 * onboard_employee — Automate new-hire onboarding form completion
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function onboard_employee(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: onboard_employee', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      // TODO: Replace with actual Workday HCM selectors
    // await page.goto(`${process.env.WORKDAY_URL}/path/to/onboard-employee`);
    // await page.waitForSelector('.main-content, #content, [data-testid="loaded"]', { timeout: 15000 });
    const result = await page.evaluate(() => {
      return { status: 'ok', data: null };
    });
    log('onboard_employee complete', result);
    return result;
    } catch (err) {
      await page.screenshot({ path: `error-onboard_employee-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

/**
 * extract_headcount — Extract current headcount and org hierarchy
 * @param {import('puppeteer').Page} page
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
async function extract_headcount(page, opts = {}) {
  const { retry, humanDelay, log } = require('./utils');

  log('Running: extract_headcount', opts);

  return retry(async () => {
    await humanDelay(500, 1500);
    try {
      // TODO: Replace with actual Workday HCM selectors
    // await page.goto(`${process.env.WORKDAY_URL}/path/to/extract-headcount`);
    // await page.waitForSelector('.main-content, #content, [data-testid="loaded"]', { timeout: 15000 });
    const result = await page.evaluate(() => {
      return { status: 'ok', data: null };
    });
    log('extract_headcount complete', result);
    return result;
    } catch (err) {
      await page.screenshot({ path: `error-extract_headcount-${Date.now()}.png` }).catch(() => {});
      throw err;
    }
  }, { attempts: 3, delay: 2000 });
}

module.exports = {
  login_workday,
  run_report,
  create_absence_request,
  onboard_employee,
  extract_headcount,
};
