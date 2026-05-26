import * as puppeteer from 'puppeteer-core';

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
            // Find text like "18.267 ulasan"
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

        console.log("Clicked reviews link. Waiting 6s...");
        await new Promise(r => setTimeout(r, 6000));

        // Inspect DOM structure of reviews
        const info = await page.evaluate(() => {
            const list: any[] = [];
            // Let's find elements that contain reviews. Usually they have class names like "m6QErb" and display name like "Dariyanto Arkarna"
            // Let's find all divs and scan their classes/texts
            document.querySelectorAll('*').forEach((el: any) => {
                const text = el.childNodes.length > 0 && Array.from(el.childNodes).some((n: any) => n.nodeType === 3 && n.textContent.trim())
                    ? el.textContent.trim()
                    : '';
                
                // Let's search for elements containing author names (we saw "Dariyanto Arkarna" in the earlier inspect scan)
                if (text && (text.includes('Dariyanto Arkarna') || text.includes('Mohammad Qosim') || text.includes('Yudha Handara'))) {
                    // Trace up to review card
                    list.push({
                        tagName: el.tagName,
                        className: el.className,
                        text: text.substring(0, 100),
                        parentTagName: el.parentElement?.tagName,
                        parentClass: el.parentElement?.className,
                        grandParentClass: el.parentElement?.parentElement?.className
                    });
                }
            });
            return list;
        });

        console.log("GMAPS REVIEW NODE HIERARCHY:", JSON.stringify(info, null, 2));

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
