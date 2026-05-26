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
        await new Promise(r => setTimeout(r, 4000));

        console.log("Locating reviews link...");
        const clicked = await page.evaluate(() => {
            // Find an anchor or element containing 'ulasan Google' or 'ulasan' and has data-fid
            const elements = Array.from(document.querySelectorAll('a, span, div'));
            const trigger = elements.find(el => {
                const text = el.textContent || '';
                const hasFid = el.getAttribute('data-fid') || el.getAttribute('fid');
                return hasFid && (text.includes('ulasan Google') || text.includes('ulasan') || text.includes('Ulasan'));
            });

            if (trigger) {
                (trigger as any).click();
                return true;
            }
            return false;
        });

        if (clicked) {
            console.log("Clicked! Waiting 5s for reviews modal...");
            await new Promise(r => setTimeout(r, 5000));

            const screenshotPath = path.resolve(__dirname, 'gmaps_click_search_screenshot.png');
            await page.screenshot({ path: screenshotPath });
            console.log(`Saved screenshot to ${screenshotPath}`);

            const reviews = await page.evaluate(() => {
                const results: any[] = [];
                document.querySelectorAll('div.bwb7ce').forEach((el: any) => {
                    const author = el.querySelector('.Vpc5Fe')?.textContent?.trim() || 'Anonim';
                    const text = el.querySelector('.OA1nbd')?.textContent?.trim() || '';
                    
                    const ratingStr = el.querySelector('.dHX2k')?.getAttribute('aria-label') || '';
                    const ratingMatch = ratingStr.match(/([0-5]([\.,]0)?)/);
                    const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : 5;

                    const time = el.querySelector('.y3Ibjb')?.textContent?.trim() || 'Baru saja';

                    results.push({ author, rating, text, time });
                });
                return results;
            });

            console.log("Scraped Reviews:", JSON.stringify(reviews, null, 2));
        } else {
            console.log("Could not locate or click reviews link.");
        }

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
