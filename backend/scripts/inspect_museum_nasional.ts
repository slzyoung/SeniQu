import * as puppeteer from 'puppeteer-core';
import * as path from 'path';

async function test() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,1024',
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const fid = "0x2e69f5d4b571f28b:0xa41541566f6058ed";
    const url = `https://www.google.com/search?q=Museum%20Nasional%20Jakarta&hl=id&gl=id#lrd=${fid},1`;
    console.log(`Navigating to: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 8000));

        const screenshotPath = path.resolve(__dirname, 'museum_nasional_screenshot.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot to ${screenshotPath}`);

        // Check if there are reviews elements on page
        const info = await page.evaluate(() => {
            const results: any[] = [];
            document.querySelectorAll('div.bwb7ce').forEach((el: any) => {
                results.push({
                    author: el.querySelector('.Vpc5Fe')?.textContent?.trim() || '',
                    text: el.querySelector('.OA1nbd')?.textContent?.trim() || ''
                });
            });
            return {
                bodySnippet: document.body.innerText.substring(0, 1000),
                totalBwb7ce: document.querySelectorAll('div.bwb7ce').length,
                reviews: results
            };
        });

        console.log("INFO:", JSON.stringify(info, null, 2));

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
