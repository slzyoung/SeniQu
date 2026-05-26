import * as puppeteer from 'puppeteer-core';

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

    const query = encodeURIComponent("Museum Geologi Bandung");
    const url = `https://www.google.com/maps/search/${query}?hl=id`;

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 6000));

        const coverPhoto = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            const matches = imgs.map(img => img.getAttribute('src') || '')
                .filter(src => src.includes('googleusercontent.com') || src.includes('gps-cs-s'));
            return matches.length > 0 ? matches[0] : null;
        });

        if (!coverPhoto) {
            console.log("No cover photo found.");
            return;
        }

        console.log("Original Cover Photo URL:", coverPhoto);

        // Resize trick: replace suffix after '=' with 'w1200-h800-p'
        let resizedUrl = coverPhoto;
        if (coverPhoto.includes('=')) {
            const base = coverPhoto.split('=')[0];
            resizedUrl = `${base}=w1200-h800-p`;
        } else {
            resizedUrl = `${coverPhoto}=w1200-h800-p`;
        }

        console.log("Resized URL:", resizedUrl);

        // Fetch to check status and size
        const res = await fetch(resizedUrl);
        console.log("Fetch Status:", res.status);
        console.log("Content-Type:", res.headers.get('content-type'));
        console.log("Content-Length (bytes):", res.headers.get('content-length'));

    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

test();
