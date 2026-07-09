const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');
const fs = require('fs');

(async () => {
  const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar');
  const browser = await puppeteer.launch({ executablePath, headless: true, args: chromium.args });
  const page = await browser.newPage();
  
  const html = `
  <html>
    <head>
      <style>
        body { margin: 0; counter-reset: pagenum; }
        .page { height: 100vh; }
        thead { counter-increment: pagenum; }
        .page-num::after { content: counter(pagenum); }
      </style>
    </head>
    <body>
      <table style="width: 100%;">
        <thead style="display: table-header-group;">
          <tr>
            <th>
              <div class="page-num">Page: </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="page">Content 1</div>
              <div class="page">Content 2</div>
              <div class="page">Content 3</div>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>`;
  
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4' });
  fs.writeFileSync('test-counter.pdf', pdf);
  await browser.close();
})();
