const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const page = await browser.newPage();
  const html = fs.readFileSync('test-header-footer.html', 'utf8');
  await page.setContent(html);
  await page.pdf({ 
    path: 'test-header-footer.pdf', 
    format: 'A4', 
    printBackground: true, 
    displayHeaderFooter: true, 
    headerTemplate: '<div></div>', 
    footerTemplate: '<div style="width:100%; text-align:right; font-size:12px;"><span class="pageNumber"></span></div>' 
  });
  await browser.close();
  console.log('PDF generated');
})();
