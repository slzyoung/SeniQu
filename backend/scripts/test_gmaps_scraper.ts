import * as puppeteer from 'puppeteer-core';
import * as path from 'path';

async function scrapeLandmark(name: string, city: string) {
    console.log(`Scraping "${name}" in "${city}"...`);
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

    const query = encodeURIComponent(`${name} ${city}`);
    const url = `https://www.google.com/maps/search/${query}?hl=id`;
    
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 6000));

        // 1. Extract Cover Photo
        const coverPhoto = await page.evaluate(() => {
            // Find images hosted on googleusercontent.com
            const imgs = Array.from(document.querySelectorAll('img'));
            const matches = imgs.map(img => img.getAttribute('src') || '')
                .filter(src => src.includes('googleusercontent.com') || src.includes('gps-cs-s'));
            
            return matches.length > 0 ? matches[0] : null;
        });

        console.log("Scraped Cover Photo:", coverPhoto);

        // 2. Click on "ulasan" (reviews) link to load reviews
        console.log("Locating reviews trigger...");
        const clicked = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            const trigger = elements.find(el => el.textContent && el.textContent.includes('ulasan') && el.tagName === 'BUTTON');
            if (trigger) {
                (trigger as any).click();
                return true;
            }
            // Check if there is a tab or text like "18.267 ulasan"
            const textTrigger = elements.find(el => el.textContent && /[\d\.]+\s+ulasan/.test(el.textContent) && el.tagName === 'SPAN');
            if (textTrigger) {
                // Find clickable parent
                let curr: any = textTrigger;
                for (let i = 0; i < 5; i++) {
                    if (curr.click && (curr.tagName === 'BUTTON' || curr.tagName === 'A' || curr.classList.contains('hfpxzc'))) {
                        curr.click();
                        return true;
                    }
                    curr = curr.parentElement;
                }
            }
            return false;
        });

        if (clicked) {
            console.log("Clicked reviews button. Waiting 5s for reviews...");
            await new Promise(r => setTimeout(r, 5000));

            // Scrape reviews
            const reviews = await page.evaluate(() => {
                const results: any[] = [];
                // Review cards in Google Maps typically have class '.jstiG' or similar, or have data-review-id
                // Let's find divs containing review text
                const cardSelectors = ['.jstiG', '.WI7C6', '.jJc9Ad'];
                let cards: any[] = [];
                for (const selector of cardSelectors) {
                    const found = document.querySelectorAll(selector);
                    if (found.length > 0) {
                        cards = Array.from(found);
                        break;
                    }
                }

                if (cards.length === 0) {
                    // Try to find elements that have class names common to review items
                    cards = Array.from(document.querySelectorAll('div[data-review-id]'));
                }

                cards.forEach((el: any) => {
                    const author = el.querySelector('.d4158e, .TS5Du, .yC3ZMb')?.innerText?.trim() || 'Anonim';
                    const text = el.querySelector('.wiI79c, .Jtu6Td')?.innerText?.trim() || '';
                    
                    const starsEl = el.querySelector('span[aria-label*="bintang"], span[aria-label*="star"], span[aria-label*="Rating"]');
                    const starsText = starsEl ? starsEl.getAttribute('aria-label') : '';
                    const ratingMatch = starsText ? starsText.match(/([0-5]([\.,]5)?)/) : null;
                    const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : 5;

                    const time = el.querySelector('.rsqawe, .comment-section-header-meta')?.innerText?.trim() || 'Baru saja';

                    if (text || author !== 'Anonim') {
                        results.push({ author, rating, text, time });
                    }
                });

                return results.slice(0, 5);
            });

            console.log("Scraped Reviews:", JSON.stringify(reviews, null, 2));
        } else {
            console.log("Could not trigger reviews click.");
        }

    } catch (e: any) {
        console.error("Error during scraping:", e.message);
    } finally {
        await browser.close();
    }
}

scrapeLandmark("Museum Geologi Bandung", "Bandung");
