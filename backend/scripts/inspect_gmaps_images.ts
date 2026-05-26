import * as puppeteer from 'puppeteer-core';
import * as path from 'path';

async function test() {
    console.log("Launching Chrome...");
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

    // Search for a landmark on Google Maps
    const query = encodeURIComponent("Museum Geologi Bandung");
    const url = `https://www.google.com/maps/search/${query}?hl=id`;
    console.log(`Navigating to Google Maps search: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log("Page loaded. Waiting 8s for map content to load...");
        await new Promise(r => setTimeout(r, 8000));

        const screenshotPath = path.resolve(__dirname, 'gmaps_direct_screenshot.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot to ${screenshotPath}`);

        // Scrape all img urls
        const images = await page.evaluate(() => {
            const list: string[] = [];
            document.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src');
                if (src && (src.includes('googleusercontent') || src.includes('lh5.googleusercontent') || src.includes('lh3.googleusercontent') || src.includes('photos'))) {
                    list.push(src);
                }
            });
            return list;
        });

        console.log(`Found ${images.length} Google Maps images:`);
        images.slice(0, 10).forEach((src, idx) => {
            console.log(`  [${idx + 1}] ${src.substring(0, 120)}`);
        });

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
