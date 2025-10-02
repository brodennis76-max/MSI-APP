import * as Print from 'expo-print';

/**
 * Universal PDF Generation Utility
 * 
 * This utility provides a simple function to generate PDFs using the same
 * improved HTML and 0.5" margin specifications as the UniversalPDFGenerator.
 * 
 * Use this when you need to generate PDFs programmatically without the UI component.
 */

export const generateUniversalPDF = async (clientData, options = {}) => {
  const {
    customTitle = "Account Instructions",
    includeFooter = true
  } = options;

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Account Instructions - ${clientData.name}</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in;
            @bottom-center {
              content: "Page " counter(page);
              font-size: 10px;
              color: #666;
            }
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.4;
            color: #000;
            background: white;
            font-size: 12px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }
          
          .pdf-container {
            width: 100%;
            max-width: 7.5in;
            margin: 0 auto;
            padding: 0;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-top: 0;
          }
          
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          
          .title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          
          .client-name {
            font-size: 14px;
            margin-bottom: 20px;
            color: #333;
          }
          
          .info-section {
            margin-bottom: 20px;
          }
          
          .info-row {
            display: flex;
            margin-bottom: 8px;
            align-items: flex-start;
          }
          
          .info-label {
            font-weight: bold;
            width: 120px;
            flex-shrink: 0;
            color: #333;
          }
          
          .info-value {
            flex: 1;
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: pre-wrap;
            hyphens: auto;
            color: #333;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: bold;
            margin: 25px 0 15px 0;
            text-transform: uppercase;
            color: #333;
            page-break-after: avoid;
          }
          
          .subsection {
            margin: 15px 0 15px 20px;
            page-break-inside: avoid;
          }
          
          .subsection-title {
            font-size: 14px;
            font-weight: bold;
            margin: 15px 0 10px 0;
            color: #555;
            text-decoration: underline;
          }
          
          .content {
            margin-bottom: 15px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: pre-wrap;
            hyphens: auto;
            line-height: 1.5;
            color: #333;
            text-align: justify;
          }
          
          .footer-section {
            margin-top: 40px;
            page-break-inside: avoid;
          }
          
          .footer-title {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            color: #333;
          }
          
          .footer-content {
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            margin-bottom: 8px;
          }
          
          .avoid-break {
            page-break-inside: avoid;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          @media print {
            body { 
              margin: 0 !important; 
              padding: 0 !important; 
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            .pdf-container { 
              margin: 0 !important; 
              padding: 0 !important; 
              width: 100% !important;
              max-width: none !important;
            }
            
            .avoid-break {
              page-break-inside: avoid;
            }
            
            .page-break {
              page-break-before: always;
            }
          }
          
          p, div, span {
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        </style>
      </head>
      <body>
        <div class="pdf-container">
          <div class="header">
            <div class="company-name">MSI INVENTORY</div>
            <div class="title">ACCOUNT INSTRUCTIONS:</div>
            <div class="client-name">${clientData.name}</div>
          </div>

          <div class="info-section avoid-break">
            ${clientData.name ? `
              <div class="info-row">
                <div class="info-label">Client Name:</div>
                <div class="info-value">${clientData.name}</div>
              </div>
            ` : ''}
            
            ${clientData.email ? `
              <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value">${clientData.email}</div>
              </div>
            ` : ''}
            
            ${clientData.address ? `
              <div class="info-row">
                <div class="info-label">Address:</div>
                <div class="info-value">${clientData.address}</div>
              </div>
            ` : ''}
            
            ${clientData.phone ? `
              <div class="info-row">
                <div class="info-label">Phone:</div>
                <div class="info-value">${clientData.phone}</div>
              </div>
            ` : ''}
            
            <div class="info-row">
              <div class="info-label">Generated:</div>
              <div class="info-value">${currentDate}</div>
            </div>
          </div>

          <!-- 1. PRE-INVENTORY SECTION -->
          ${clientData.Pre_Inv || clientData.preInventory || clientData.sections?.[0]?.content ? `
            <div class="avoid-break">
              <div class="section-title">Pre-Inventory Instructions</div>
              <div class="content">${clientData.Pre_Inv || clientData.preInventory || clientData.sections?.[0]?.content || ''}</div>
              
              <!-- Area Mapping Subsection -->
              ${clientData.sections?.[0]?.subsections?.[0]?.content ? `
                <div class="subsection">
                  <div class="subsection-title">Area Mapping</div>
                  <div class="content">${clientData.sections[0].subsections[0].content}</div>
                </div>
              ` : ''}
              
              <!-- Store Prep Subsection -->
              ${clientData.sections?.[0]?.subsections?.[1]?.content ? `
                <div class="subsection">
                  <div class="subsection-title">Store Prep Instructions</div>
                  <div class="content">${clientData.sections[0].subsections[1].content}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- 2. INVENTORY PROCEDURES -->
          ${clientData.Inv_Proc || clientData.inventoryProcedures ? `
            <div class="avoid-break">
              <div class="section-title">Inventory Procedures</div>
              <div class="content">${clientData.Inv_Proc || clientData.inventoryProcedures}</div>
            </div>
          ` : ''}

          <!-- 3. AUDITS -->
          ${clientData.Audits || clientData.Audits_Inv_Flow || clientData.auditsInventoryFlow ? `
            <div class="avoid-break">
              <div class="section-title">Audits</div>
              <div class="content">${clientData.Audits || clientData.Audits_Inv_Flow || clientData.auditsInventoryFlow}</div>
            </div>
          ` : ''}

          <!-- 4. INVENTORY FLOW -->
          ${clientData.Inv_Flow || clientData.inventoryFlow ? `
            <div class="avoid-break">
              <div class="section-title">Inventory Flow</div>
              <div class="content">${clientData.Inv_Flow || clientData.inventoryFlow}</div>
            </div>
          ` : ''}

          <!-- 5. PRE-INVENTORY TEAM INSTRUCTIONS -->
          ${clientData['Team-Instr'] || clientData.Team_Instr || clientData.teamInstructions ? `
            <div class="avoid-break">
              <div class="section-title">Pre-Inventory Team Instructions</div>
              <div class="content">${clientData['Team-Instr'] || clientData.Team_Instr || clientData.teamInstructions}</div>
            </div>
          ` : ''}

          <!-- 6. NON-COUNT PRODUCTS -->
          ${clientData.noncount || clientData.Non_Count || clientData.nonCountProducts ? `
            <div class="avoid-break">
              <div class="section-title">Non-Count Products</div>
              <div class="content">${clientData.noncount || clientData.Non_Count || clientData.nonCountProducts}</div>
            </div>
          ` : ''}

          <!-- 7. REPORTS SECTION -->
          <div class="avoid-break">
            <div class="section-title">Reports</div>
            
            <!-- Posting Sheets -->
            ${clientData.Prog_Rep || clientData.progressiveReports ? `
              <div class="subsection">
                <div class="subsection-title">Posting Sheets</div>
                <div class="content">${clientData.Prog_Rep || clientData.progressiveReports}</div>
              </div>
            ` : ''}
            
            <!-- Utility (if exists) -->
            ${clientData.Utility || clientData.utility ? `
              <div class="subsection">
                <div class="subsection-title">Utility</div>
                <div class="content">${clientData.Utility || clientData.utility}</div>
              </div>
            ` : ''}
            
            <!-- Finalizing the Count -->
            ${clientData.Finalize || clientData.Fin_Count || clientData.finalizingCount ? `
              <div class="subsection">
                <div class="subsection-title">Finalizing the Count</div>
                <div class="content">${clientData.Finalize || clientData.Fin_Count || clientData.finalizingCount}</div>
              </div>
            ` : ''}
            
            <!-- Final Reports -->
            ${clientData.Fin_Rep || clientData.finalReports ? `
              <div class="subsection">
                <div class="subsection-title">Final Reports</div>
                <div class="content">${clientData.Fin_Rep || clientData.finalReports}</div>
              </div>
            ` : ''}
            
            <!-- Final Processing -->
            ${clientData.Processing || clientData.processing ? `
              <div class="subsection">
                <div class="subsection-title">Final Processing</div>
                <div class="content">${clientData.Processing || clientData.processing}</div>
              </div>
            ` : ''}
          </div>

          ${clientData.Additional_Notes || clientData.additionalNotes ? `
            <div class="avoid-break">
              <div class="section-title">Additional Notes</div>
              <div class="content">${clientData.Additional_Notes || clientData.additionalNotes}</div>
            </div>
          ` : ''}

        </div>
      </body>
    </html>
  `;

  try {
    console.log('🎯 UNIVERSAL PDF UTILS: Generating PDF...');
    
    // Generate PDF using expo-print with exact 0.5" margins
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      width: 612, // 8.5 inches * 72 points/inch
      height: 792, // 11 inches * 72 points/inch
      margins: {
        left: 36,   // 0.5 inch (36 points)
        right: 36,  // 0.5 inch (36 points)
        top: 36,    // 0.5 inch (36 points)
        bottom: 36  // 0.5 inch (36 points)
      }
    });

    console.log('✅ UNIVERSAL PDF UTILS: PDF generated successfully:', uri);
    return uri;
    
  } catch (error) {
    console.error('❌ UNIVERSAL PDF UTILS: Error generating PDF:', error);
    throw error;
  }
};
