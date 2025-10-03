// Server-side PDF generation example (Node.js with Express)
// This would run on your server, not in the React Native app

const express = require('express');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

const app = express();

// Initialize Firebase Admin
const serviceAccount = require('./path-to-your-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.get('/generate-pdf/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Fetch client data from Firebase
    const clientDoc = await db.collection('clients').doc(clientId).get();
    const clientData = clientDoc.data();
    
    if (!clientData) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Generate HTML
    const html = generateHTML(clientData);
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();
    
    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="account-instructions-${clientData.name}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

function generateHTML(clientData) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Account Instructions - ${clientData.name}</title>
        <style>
          @page {
            margin: 0;
            size: letter;
          }
          
          /* Same styles as client-side version */
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            color: #333;
            width: 8.5in;
            min-height: 11in;
          }
          
          .pdf-container {
            width: 8.5in;
            min-height: 11in;
            padding: 1in;
            box-sizing: border-box;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #007AFF;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #007AFF;
            margin-bottom: 10px;
          }
          .client-name {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
          }
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #007AFF;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .field {
            margin-bottom: 15px;
          }
          .field-label {
            font-weight: bold;
            color: #555;
            margin-bottom: 5px;
          }
          .field-value {
            background-color: #f8f9fa;
            padding: 10px;
            border-left: 4px solid #007AFF;
            border-radius: 4px;
            white-space: pre-wrap;
          }
          .instructions-list {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
          }
          .warning-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-left: 4px solid #f39c12;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
          }
          .warning-text {
            color: #856404;
            font-weight: bold;
            text-align: center;
            font-size: 16px;
          }
          @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="pdf-container">
          <div class="header">
          <div class="company-name">MSI INVENTORY</div>
          <div class="client-name">Account Instructions for ${clientData.name}</div>
        </div>

        <!-- All the same content as client-side version -->
        <!-- ... rest of the HTML content ... -->
        </div>
      </body>
    </html>
  `;
}

app.listen(3000, () => {
  console.log('PDF generation server running on port 3000');
});









