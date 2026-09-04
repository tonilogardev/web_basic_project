module.exports = {
  pdf_options: {
    format: 'A4',
    margin: { top: '20mm', bottom: '25mm', left: '20mm', right: '20mm' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;"><span class="pageNumber"></span></div>'
  },
  stylesheet_encoding: 'utf-8',
  css: `
    body {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 11pt !important;
      line-height: 1.5;
    }
    .markdown-body {
      font-size: 11pt !important;
    }
  `
};
