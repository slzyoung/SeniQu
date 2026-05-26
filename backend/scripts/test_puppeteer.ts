import * as puppeteer from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
    console.log("Launching local Chrome in stealth mode...");
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: true,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,1024',
            '--lang=id-ID,id,en-US,en'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] });
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Query with name and exact address to force Knowledge Graph panel
    const query = encodeURIComponent("Galeri Nasional Indonesia, Jl. Medan Merdeka Tim. No.14");
    const fid = "0x2e69f432fb0c95a5:0x5a9cae96473931a8";
    const url = `https://www.google.com/search?q=${query}&hl=id&gl=id#lrd=${fid},1`;
    console.log(`Navigating directly to: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log("Page loaded. Waiting 8s for reviews modal...");
        await new Promise(r => setTimeout(r, 8000));

        // Take a screenshot to inspect visually
        const screenshotPath = path.resolve(__dirname, 'gmaps_screenshot.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to ${screenshotPath}`);

        // Extract reviews from the modal
        const content = await page.evaluate(() => {
            const reviews: any[] = [];
            // Select all review containers in the modal
            // Google's reviews container typically has class "gws-localreviews__google-review" or "[data-review-id]" or ".jJc9Ad"
            const reviewElements = document.querySelectorAll('div[data-review-id], .gws-localreviews__google-review, .jJc9Ad');
            
            reviewElements.forEach((el: any) => {
                const authorEl = el.querySelector('.TS5Du, .jJc9Ad, a[href*="/contrib/"]');
                const author = authorEl ? authorEl.innerText.trim() : 'Pengunjung';

                const starsEl = el.querySelector('span[aria-label*="bintang"], span[aria-label*="star"], span[aria-label*="Rating"]');
                const starsText = starsEl ? starsEl.getAttribute('aria-label') : '';
                const ratingMatch = starsText ? starsText.match(/([0-5]([\.,]5)?)/) : null;
                const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : 5;

                const textEl = el.querySelector('.Jtu6Td, span[jsname="g3nbe"], div[style*="-webkit-line-clamp"]');
                const text = textEl ? textEl.innerText.trim() : '';

                const timeEl = el.querySelector('.comment-section-header-meta, .ea07fo, span:last-child');
                const time = timeEl ? timeEl.innerText.trim() : 'Baru-baru ini';

                if (text || author !== 'Pengunjung') {
                    reviews.push({ author, rating, text, time });
                }
            });

            return {
                bodyText: document.body.innerText.substring(0, 1000),
                reviewsFound: reviews.length,
                reviewData: reviews.slice(0, 5)
            };
        });

        console.log("Body text snippet:\n", content.bodyText);
        console.log(`Found ${content.reviewsFound} parsed reviews.`);
        console.log("Parsed review details:\n", JSON.stringify(content.reviewData, null, 2));

    } catch (e: any) {
        console.error("Error during test:", e.message);
    } finally {
        await browser.close();
        console.log("Browser closed.");
    }
}

test();
