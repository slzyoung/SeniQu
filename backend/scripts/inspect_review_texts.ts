import * as puppeteer from 'puppeteer-core';

async function test() {
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

    const query = encodeURIComponent("Galeri Nasional Indonesia, Jl. Medan Merdeka Tim. No.14");
    const fid = "0x2e69f432fb0c95a5:0x5a9cae96473931a8";
    const url = `https://www.google.com/search?q=${query}&hl=id&gl=id#lrd=${fid},1`;

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 8000));

        const elements = await page.evaluate(() => {
            const review = document.querySelector('div.bwb7ce');
            if (!review) return "Review not found";

            const info: any[] = [];
            review.querySelectorAll('*').forEach((el: any) => {
                const text = el.childNodes.length > 0 && Array.from(el.childNodes).some((n: any) => n.nodeType === 3 && n.textContent.trim())
                    ? el.textContent.trim()
                    : '';
                
                if (text || el.getAttribute('aria-label')) {
                    info.push({
                        tagName: el.tagName,
                        className: el.className,
                        text: text.substring(0, 150),
                        ariaLabel: el.getAttribute('aria-label') || ''
                    });
                }
            });
            return info;
        });

        console.log("REVIEW ELEMENTS WITH TEXT/ARIA:", JSON.stringify(elements, null, 2));

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
