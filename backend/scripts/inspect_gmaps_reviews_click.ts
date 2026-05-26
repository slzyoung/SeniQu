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
    const url = `https://www.google.com/maps/search/${query}?hl=id`;

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 6000));

        // Click reviews
        await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            const trigger = spans.find(el => el.textContent && /[\d\.]+\s+ulasan/.test(el.textContent));
            if (trigger) {
                let curr: any = trigger;
                for (let i = 0; i < 5; i++) {
                    if (curr.click && (curr.tagName === 'BUTTON' || curr.tagName === 'A' || curr.classList.contains('hfpxzc'))) {
                        curr.click();
                        break;
                    }
                    curr = curr.parentElement;
                }
            }
        });

        console.log("Clicked. Waiting 6s...");
        await new Promise(r => setTimeout(r, 6000));

        // Take a screenshot
        const screenshotPath = path.resolve(__dirname, 'gmaps_reviews_clicked.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved screenshot to ${screenshotPath}`);

        // Dump DOM texts and classes
        const info = await page.evaluate(() => {
            const list: any[] = [];
            // Let's find elements that contain text. We'll filter out very long texts and keep only the ones that look like reviews or names
            document.querySelectorAll('div, span, button, a').forEach((el: any) => {
                const text = el.childNodes.length > 0 && Array.from(el.childNodes).some((n: any) => n.nodeType === 3 && n.textContent.trim())
                    ? el.textContent.trim()
                    : '';
                
                if (text && text.length > 5 && text.length < 200) {
                    list.push({
                        tagName: el.tagName,
                        className: el.className,
                        text
                    });
                }
            });
            return list;
        });

        console.log("DOM TEXTS:", JSON.stringify(info.slice(0, 100), null, 2));

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
