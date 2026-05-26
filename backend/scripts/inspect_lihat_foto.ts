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
    const url = `https://www.google.com/search?q=${query}&hl=id&gl=id`;

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 6000));

        const html = await page.evaluate(() => {
            const all = Array.from(document.querySelectorAll('*'));
            const target = all.find(el => el.textContent && el.textContent.includes('Lihat foto') && el.children.length === 0);
            
            if (!target) return "Lihat foto not found";

            // Walk up 3 levels and print parent HTML
            let parent = target.parentElement;
            let count = 0;
            while (parent && count < 4) {
                parent = parent.parentElement;
                count++;
            }
            return parent ? parent.outerHTML.substring(0, 1500) : "No parent";
        });

        console.log("HTML NEAR LIHAT FOTO:\n", html);

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
