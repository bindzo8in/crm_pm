const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setContent(`
    <style>
      @page { margin: 20mm 0; }
      @page :first { margin: 0; }
      @page signature { margin: 0; }
      .cover { page: cover; height: 1122px; }
      .content { height: 1122px; }
      .signature { page: signature; height: 1122px; }
    </style>
    <div class="cover">Cover (No footer)</div>
    <div class="content">Content (Has footer)</div>
    <div class="signature">Signature (No footer)</div>
  `);
  await page.pdf({ 
    path: 'test-css-margins.pdf', 
    format: 'A4', 
    displayHeaderFooter: true, 
    footerTemplate: '<div style="width:100%; text-align:right; font-size:12px;">FOOTER_TEXT <span class="pageNumber"></span></div>',
    preferCSSPageSize: true
  });
  await browser.close();
  const pdf = fs.readFileSync('test-css-margins.pdf', 'utf8');
  console.log('FOOTER_TEXT count:', (pdf.match(/FOOTER_TEXT/g) || []).length);
})();
