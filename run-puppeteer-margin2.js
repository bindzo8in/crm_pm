const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setContent('<style>@page :first { margin: 0; }</style><div style="height: 1122px;">Page 1</div><div style="height: 1122px;">Page 2</div>');
  await page.pdf({ 
    path: 'test-margin2.pdf', 
    format: 'A4', 
    displayHeaderFooter: true, 
    footerTemplate: '<div>FOOTER_TEXT</div>',
    margin: { bottom: '20mm' }
  });
  await browser.close();
  const pdf = fs.readFileSync('test-margin2.pdf', 'utf8');
  console.log('FOOTER_TEXT count:', (pdf.match(/FOOTER_TEXT/g) || []).length);
})();
