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
    const url = `https://www.google.com/search?q=${query}&hl=id&gl=id`;

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 4000));

        const images = await page.evaluate(() => {
            const list: any[] = [];
            document.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src') || '';
                const parent = img.parentElement;
                if (src.includes('googleusercontent.com') || src.includes('lh3.google') || src.includes('lh5.google')) {
                    list.push({
                        src: src.substring(0, 150),
                        parentTagName: parent?.tagName,
                        parentClass: parent?.className,
                        width: img.width,
                        height: img.height
                    });
                }
            });
            return list;
        });

        console.log("GOOGLE USER CONTENT IMAGES:", JSON.stringify(images, null, 2));

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
