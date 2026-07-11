const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setContent('<style>@page { margin: 20mm 0; } @page :first { margin: 0; }</style><div style="height: 1122px;">Page 1</div><div style="height: 1122px;">Page 2</div>');
  await page.pdf({ 
    path: 'test-margin.pdf', 
    format: 'A4', 
    displayHeaderFooter: true, 
    footerTemplate: '<div>FOOTER_TEXT</div>' 
  });
  await browser.close();
  const pdf = fs.readFileSync('test-margin.pdf', 'utf8');
  console.log('FOOTER_TEXT count:', (pdf.match(/FOOTER_TEXT/g) || []).length);
})();
