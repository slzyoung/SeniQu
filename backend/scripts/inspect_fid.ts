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

        const data = await page.evaluate(() => {
            const matches: any[] = [];
            // Search all elements for data-fid or data-cid or lrd
            document.querySelectorAll('*').forEach(el => {
                const fid = el.getAttribute('data-fid');
                const cid = el.getAttribute('data-cid');
                const jsaction = el.getAttribute('jsaction') || '';
                
                if (fid || cid) {
                    matches.push({
                        tagName: el.tagName,
                        className: el.className,
                        fid,
                        cid,
                        text: el.textContent?.substring(0, 100).trim()
                    });
                }
            });

            // Also search for links containing lrd
            document.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href') || '';
                if (href.includes('lrd=')) {
                    matches.push({
                        tagName: 'A',
                        className: a.className,
                        href: href.substring(0, 150),
                        text: a.textContent?.trim()
                    });
                }
            });

            return matches;
        });

        console.log("MATCHES:", JSON.stringify(data, null, 2));

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
