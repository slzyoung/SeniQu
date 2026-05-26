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

    const query = encodeURIComponent("Museum Geologi Bandung");
    const url = `https://www.google.com/search?q=${query}&hl=id&gl=id`;
    console.log(`Navigating to: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log("Waiting 6s...");
        await new Promise(r => setTimeout(r, 6000));

        const screenshotPath = path.resolve(__dirname, 'gmaps_search_only_screenshot.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot to ${screenshotPath}`);

        const images = await page.evaluate(() => {
            const list: any[] = [];
            // Dump all image attributes to find where the cover photo is
            document.querySelectorAll('img').forEach((img, idx) => {
                const src = img.getAttribute('src') || '';
                const dataSrc = img.getAttribute('data-src') || '';
                const parent = img.parentElement;
                
                // Let's filter out tiny icons/trackers
                if (src.length > 50 || dataSrc.length > 50) {
                    list.push({
                        idx,
                        src: src.substring(0, 100),
                        dataSrc: dataSrc.substring(0, 100),
                        alt: img.getAttribute('alt') || '',
                        parentTag: parent?.tagName,
                        parentClass: parent?.className
                    });
                }
            });
            return list;
        });

        console.log("Images found:", JSON.stringify(images, null, 2));

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
