import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';

/**
 * UNIVERSAL PDF GENERATOR
 * 
 * This is the ONLY PDF generator used throughout the entire MSI app.
 * It replaces ALL existing PDF generators:
 * - FirebasePDFGenerator
 * - CustomerPDFGenerator  
 * - PDFGenerator
 * - WebPDFGenerator
 * - ImprovedPDFGenerator
 * - PDFBoxGenerator
 * - All PDF generation in FinalProcessingForm, ClientPDFViewer, etc.
 */
const UniversalPDFGenerator = ({ 
  clientData = null,
  clientId = null,
  onComplete = null,
  onBack = null,
  showPreview = true,
  customTitle = "Account Instructions",
  emailAfterGeneration = false,
  autoDownload = false
}) => {
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedClientData, setFetchedClientData] = useState(null);

  // Fetch client data from Firebase if clientId is provided
  useEffect(() => {
    const fetchClientData = async () => {
      if (clientId && !clientData) {
        setLoading(true);
        try {
          console.log('🔄 Fetching client data for ID:', clientId);
          const clientRef = doc(db, 'clients', clientId);
          const clientSnap = await getDoc(clientRef);
          
          if (clientSnap.exists()) {
            const data = clientSnap.data();
            console.log('📊 Raw client data from Firebase:', data);
            console.log('🔍 Required fields check:');
            console.log('  - inventoryType:', data.inventoryType);
            console.log('  - PIC:', data.PIC);
            console.log('  - startTime:', data.startTime);
            console.log('  - verification:', data.verification);
            console.log('  - updatedAt:', data.updatedAt);
            
            // Process and normalize the data like FirebasePDFGenerator does
            const processedData = { 
              id: clientSnap.id, 
              ...data,
              // Ensure all fields have default values and proper field names
              name: data.name || 'Unknown Client',
              email: data.email || '',
              address: data.address || '',
              phone: data.phone || '',
              // Don't override with 'Not specified' - use actual values from database
              inventoryType: data.inventoryType,
              accountType: data.accountType,
              PIC: data.PIC,
              startTime: data.startTime,
              storeStartTime: data.storeStartTime,
              verification: data.verification,
              updatedAt: data.updatedAt,
              additionalNotes: data.additionalNotes || '',
              Additional_Notes: data.Additional_Notes || data.additionalNotes || '',
              preInventory: data.preInventory || '',
              Pre_Inv: data.Pre_Inv || data.preInventory || '',
              Inv_Proc: data.Inv_Proc || '',
              Audits: data.Audits || '',
              Audits_Inv_Flow: data.Audits_Inv_Flow || data.Audits || '',
              Inv_Flow: data.Inv_Flow || '',
              Non_Count: data.Non_Count || data.noncount || '',
              noncount: data.noncount || data.Non_Count || '',
              'Team-Instr': data['Team-Instr'] || '',
              Team_Instr: data.Team_Instr || data['Team-Instr'] || '',
              Prog_Rep: data.Prog_Rep || '',
              Finalize: data.Finalize || '',
              Fin_Count: data.Fin_Count || data.Finalize || '',
              Fin_Rep: data.Fin_Rep || '',
              Processing: data.Processing || ''
            };
            
            console.log('✅ Processed client data:', processedData);
            console.log('🔍 Available fields:', Object.keys(processedData));
            console.log('🔍 ALL field values:', {
              preInventory: processedData.preInventory,
              Pre_Inv: processedData.Pre_Inv,
              'Team-Instr': processedData['Team-Instr'],
              Team_Instr: processedData.Team_Instr,
              Inv_Proc: processedData.Inv_Proc,
              Audits: processedData.Audits,
              Inv_Flow: processedData.Inv_Flow,
              noncount: processedData.noncount,
              Non_Count: processedData.Non_Count,
              Prog_Rep: processedData.Prog_Rep,
              Finalize: processedData.Finalize,
              Fin_Rep: processedData.Fin_Rep,
              Processing: processedData.Processing,
              sections: processedData.sections,
              additionalNotes: processedData.additionalNotes,
              Additional_Notes: processedData.Additional_Notes
            });
            console.log('🔍 RAW Firebase data (before processing):', data);
            console.log('🔍 Firebase data keys:', Object.keys(data));
            console.log('🔍 Does this client have form data?', {
              hasPreInventory: !!data.preInventory,
              hasTeamInstr: !!data['Team-Instr'],
              hasInvProc: !!data.Inv_Proc,
              hasAudits: !!data.Audits,
              hasInvFlow: !!data.Inv_Flow,
              hasNonCount: !!data.noncount,
              hasProgRep: !!data.Prog_Rep,
              hasFinalize: !!data.Finalize,
              hasFinRep: !!data.Fin_Rep,
              hasProcessing: !!data.Processing
            });
            setFetchedClientData(processedData);
          } else {
            console.error('❌ Client not found in database');
            Alert.alert('Error', 'Client not found in database');
          }
        } catch (error) {
          console.error('❌ Error fetching client data:', error);
          Alert.alert('Error', 'Failed to fetch client data from Firebase');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchClientData();
  }, [clientId, clientData]);

  // Get the current client data (either passed in or fetched)
  const getCurrentClientData = () => {
    const data = clientData || fetchedClientData;
    console.log('🔍 getCurrentClientData:', {
      hasClientData: !!clientData,
      hasFetchedClientData: !!fetchedClientData,
      finalData: !!data,
      clientId,
      loading
    });
    
    // CRITICAL DEBUG: Log the actual client data being used
    if (data) {
      console.log('🚨 CRITICAL DEBUG - Client data being used for PDF:');
      console.log('  - Name:', data.name);
      console.log('  - inventoryType:', data.inventoryType);
      console.log('  - PIC:', data.PIC);
      console.log('  - startTime:', data.startTime);
      console.log('  - verification:', data.verification);
      console.log('  - All keys:', Object.keys(data));
    } else {
      console.log('❌ NO CLIENT DATA AVAILABLE!');
    }
    
    return data;
  };

  const generateUniversalHTML = (client) => {
    console.log('🎨 generateUniversalHTML called with client:', client);
    console.log('🎨 Available client fields:', Object.keys(client || {}));
    console.log('🎨 Key field values:', {
      name: client?.name,
      inventoryType: client?.inventoryType,
      accountType: client?.accountType,
      PIC: client?.PIC,
      startTime: client?.startTime,
      storeStartTime: client?.storeStartTime,
      verification: client?.verification,
      updatedAt: client?.updatedAt,
    });
    
    // Debug the actual values that will be used in the PDF
    console.log('🔍 PDF Field Values:');
    console.log('  - Inventory:', client?.inventoryType || client?.accountType || 'Not specified');
    console.log('  - PIC:', client?.PIC || 'Not specified');
    console.log('  - Store Start Time:', client?.startTime || client?.storeStartTime || 'Not specified');
    console.log('  - Verification:', client?.verification || 'Not specified');
    console.log('  - Updated:', client?.updatedAt ? new Date(client.updatedAt.toDate ? client.updatedAt.toDate() : client.updatedAt).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    }) : new Date().toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    }));
    
    // FORCE DEBUG: Check if the fields exist
    console.log('🚨 FORCE DEBUG - Field existence check:');
    console.log('  - client.inventoryType exists:', !!client?.inventoryType);
    console.log('  - client.accountType exists:', !!client?.accountType);
    console.log('  - client.PIC exists:', !!client?.PIC);
    console.log('  - client.startTime exists:', !!client?.startTime);
    console.log('  - client.storeStartTime exists:', !!client?.storeStartTime);
    console.log('  - client.verification exists:', !!client?.verification);
    console.log('  - client.updatedAt exists:', !!client?.updatedAt);
    
    // COMPLETE CLIENT DATA DUMP
    console.log('🚨 COMPLETE CLIENT DATA DUMP:');
    console.log(JSON.stringify(client, null, 2));
    
    console.log('🎨 Other field values:', {
      preInventory: client?.preInventory,
      'Team-Instr': client?.['Team-Instr'],
      Inv_Proc: client?.Inv_Proc,
      Audits: client?.Audits,
      Inv_Flow: client?.Inv_Flow,
      noncount: client?.noncount,
      Prog_Rep: client?.Prog_Rep,
      Finalize: client?.Finalize,
      Fin_Rep: client?.Fin_Rep,
      Processing: client?.Processing,
      sections: client?.sections
    });
    
    // Helper function to check if content is default template text
    const isDefaultContent = (content, defaultText) => {
      return !content || content === defaultText || content.trim() === '';
    };
    
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Account Instructions - ${client.name}</title>
          <style>
          @page {
            size: letter;
            margin: 0.5in 0.5in 0.5in 0.5in;
            @bottom-center {
              content: "Page " counter(page);
              font-size: 10px;
              color: #666;
            }
          }
          
          @page :first {
            margin: 0.5in 0.5in 0.5in 0.5in;
          }
          
          @page :left {
            margin: 0.5in 0.5in 0.5in 0.5in;
          }
          
          @page :right {
            margin: 0.5in 0.5in 0.5in 0.5in;
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
              width: 100%;
              height: auto;
            }
            
            .pdf-container {
              width: 100%;
              margin: 0;
              padding: 0;
              box-sizing: border-box;
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
            
            /* Page break controls */
            .avoid-break {
              page-break-inside: avoid;
              break-inside: avoid;
              orphans: 3;
              widows: 3;
            }
            
            .page-break {
              page-break-before: always;
              break-before: page;
            }
            
            .section-title {
              page-break-after: avoid;
              break-after: avoid;
            }
            
            .subsection {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* Print-specific styles */
            @media print {
              @page {
                size: letter;
                margin: 0.5in !important;
              }
              
              body { 
                margin: 0 !important; 
                padding: 0 !important; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                width: 100% !important;
                height: auto !important;
              }
              
              .pdf-container { 
                margin: 0 !important; 
                padding: 0 !important; 
                width: 100% !important;
                max-width: none !important;
                box-sizing: border-box !important;
              }
              
              .avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              
              .page-break {
                page-break-before: always !important;
                break-before: page !important;
              }
              
              .section-title {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
              
              .subsection {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
            
            /* Improved text rendering */
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
              <div class="title">ACCOUNT INSTRUCTIONS</div>
              <div class="client-name">${client.name}</div>
            </div>

            <!-- CLIENT INFORMATION SECTION -->
            <div class="avoid-break">
              <div class="section-title">Client Information</div>
              <div class="content">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007AFF;">
                    <div style="font-weight: bold; color: #555; font-size: 14px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;">Inventory Type</div>
                    <div style="color: #2c3e50; font-size: 16px;">${client.inventoryType || 'Not specified'}</div>
                  </div>
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007AFF;">
                    <div style="font-weight: bold; color: #555; font-size: 14px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;">PIC (Pre-Inventory Call)</div>
                    <div style="color: #2c3e50; font-size: 16px;">${client.PIC || 'Not specified'}</div>
                  </div>
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007AFF;">
                    <div style="font-weight: bold; color: #555; font-size: 14px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;">Start Time</div>
                    <div style="color: #2c3e50; font-size: 16px;">${client.startTime || 'Not specified'}</div>
                  </div>
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007AFF;">
                    <div style="font-weight: bold; color: #555; font-size: 14px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;">Verification</div>
                    <div style="color: #2c3e50; font-size: 16px;">${client.verification || 'Not specified'}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- IMPORTANT WARNING BOX -->
            <div class="avoid-break" style="background-color: #fff3cd; border: 2px solid #ffc107; border-left: 6px solid #f39c12; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
              <div style="color: #856404; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                ⚠️ IMPORTANT: If you are going to be more than five minutes late to a store you must contact that store before you are late. NO EXCEPTIONS!!!
              </div>
            </div>

            <div class="info-section avoid-break">
              <div class="info-row">
                <div class="info-label">Inventory Type:</div>
                <div class="info-value">${client.inventoryType || 'TEST DATA - inventoryType is empty'}</div>
              </div>
              
              <div class="info-row">
                <div class="info-label">PIC (Pre-Inventory Call):</div>
                <div class="info-value">${client.PIC || 'TEST DATA - PIC is empty'}</div>
              </div>
              
              <div class="info-row">
                <div class="info-label">Start Time:</div>
                <div class="info-value">${client.startTime || 'TEST DATA - startTime is empty'}</div>
              </div>
              
              <div class="info-row">
                <div class="info-label">Verification:</div>
                <div class="info-value">${client.verification || 'TEST DATA - verification is empty'}</div>
              </div>
              
              <!-- DEBUG SECTION - Remove this after testing -->
              <div class="info-row" style="background-color: #f0f0f0; padding: 10px; margin-top: 10px; border: 1px solid #ccc;">
                <div class="info-label">DEBUG - Field Values:</div>
                <div class="info-value" style="font-size: 10px;">
                  inventoryType: "${client.inventoryType || 'undefined'}"<br/>
                  PIC: "${client.PIC || 'undefined'}"<br/>
                  startTime: "${client.startTime || 'undefined'}"<br/>
                  verification: "${client.verification || 'undefined'}"<br/>
                  <strong>Raw client object keys:</strong> ${Object.keys(client || {}).join(', ')}
                </div>
              </div>
              
              <!-- FORCE TEST SECTION - This should ALWAYS show -->
              <div class="info-row" style="background-color: #ffeb3b; padding: 10px; margin-top: 10px; border: 2px solid #ff9800;">
                <div class="info-label">FORCE TEST - This section should ALWAYS appear:</div>
                <div class="info-value" style="font-size: 12px; font-weight: bold;">
                  If you can see this, the client info section is working!
                </div>
              </div>
            </div>

            <!-- PRE-INVENTORY INSTRUCTIONS SECTION -->
            <div class="avoid-break">
              <div class="section-title">Pre-Inventory Instructions</div>
              <div class="content">${(() => {
                // Get the main pre-inventory content
                let content = client.Pre_Inv || client.preInventory || client.sections?.[0]?.content || '';
                
                // Always add ALR instructions if not already in the content
                if (!content.includes('ALR disk')) {
                  const alrValue = (client.ALR && client.ALR.trim()) ? client.ALR : 'NOT DETERMINED';
                  const baseInstructions = `• Account disk is available via the MSI website and Global Resource.
• ALR disk is ${alrValue}.
• Priors are REQUIRED for all store counts.
• Review inventory checklist before leaving the office. A copy of the inventory checklist is attached to the end of these account instructions.`;
                  
                  // If there's existing content, add the ALR instructions at the beginning
                  if (content.trim()) {
                    content = baseInstructions + '\n\n' + content;
                  } else {
                    content = baseInstructions;
                  }
                }
                
                return content;
              })()}</div>
              
              <!-- Area Mapping Subsection -->
              ${client.sections?.[0]?.subsections?.[0]?.content ? `
                <div class="subsection">
                  <div class="subsection-title">Area Mapping</div>
                  <div class="content">${client.sections[0].subsections[0].content}</div>
                </div>
              ` : ''}
              
              <!-- Store Prep Subsection -->
              ${client.sections?.[0]?.subsections?.[1]?.content ? `
                <div class="subsection">
                  <div class="subsection-title">Store Prep Instructions</div>
                  <div class="content">${client.sections[0].subsections[1].content}</div>
                </div>
              ` : ''}
            </div>

            <!-- 2. INVENTORY PROCEDURES -->
            ${client.Inv_Proc || client.inventoryProcedures ? `
              <div class="avoid-break">
                <div class="section-title">Inventory Procedures</div>
                <div class="content">${client.Inv_Proc || client.inventoryProcedures}</div>
              </div>
            ` : ''}

            <!-- 3. AUDITS -->
            ${client.Audits || client.Audits_Inv_Flow || client.auditsInventoryFlow ? `
              <div class="avoid-break">
                <div class="section-title">Audits</div>
                <div class="content">${client.Audits || client.Audits_Inv_Flow || client.auditsInventoryFlow}</div>
              </div>
            ` : ''}

            <!-- 4. INVENTORY FLOW -->
            ${client.Inv_Flow || client.inventoryFlow ? `
              <div class="avoid-break">
                <div class="section-title">Inventory Flow</div>
                <div class="content">${client.Inv_Flow || client.inventoryFlow}</div>
              </div>
            ` : ''}

            <!-- 5. PRE-INVENTORY TEAM INSTRUCTIONS -->
            ${client['Team-Instr'] || client.Team_Instr || client.teamInstructions ? `
              <div class="avoid-break">
                <div class="section-title">Pre-Inventory Team Instructions</div>
                <div class="content">${client['Team-Instr'] || client.Team_Instr || client.teamInstructions}</div>
              </div>
            ` : ''}

            <!-- 6. NON-COUNT PRODUCTS -->
            ${client.noncount || client.Non_Count || client.nonCountProducts ? `
              <div class="avoid-break">
                <div class="section-title">Non-Count Products</div>
                <div class="content">${client.noncount || client.Non_Count || client.nonCountProducts}</div>
              </div>
            ` : ''}

            <!-- 7. REPORTS SECTION -->
            ${(() => {
              const hasReportsData = client.Prog_Rep || client.progressiveReports || 
                                   client.Utility || client.utility ||
                                   client.Finalize || client.Fin_Count || client.finalizingCount ||
                                   client.Fin_Rep || client.finalReports ||
                                   client.Processing || client.processing;
              
              if (hasReportsData) {
                return `
                  <div class="avoid-break">
                    <div class="section-title">Reports</div>
                    
                    <!-- Posting Sheets -->
                    ${client.Prog_Rep || client.progressiveReports ? `
                      <div class="subsection">
                        <div class="subsection-title">Posting Sheets</div>
                        <div class="content">${client.Prog_Rep || client.progressiveReports}</div>
                      </div>
                    ` : ''}
                    
                    <!-- Utility (if exists) -->
                    ${client.Utility || client.utility ? `
                      <div class="subsection">
                        <div class="subsection-title">Utility</div>
                        <div class="content">${client.Utility || client.utility}</div>
                      </div>
                    ` : ''}
                    
                    <!-- Finalizing the Count -->
                    ${client.Finalize || client.Fin_Count || client.finalizingCount ? `
                      <div class="subsection">
                        <div class="subsection-title">Finalizing the Count</div>
                        <div class="content">${client.Finalize || client.Fin_Count || client.finalizingCount}</div>
                      </div>
                    ` : ''}
                    
                    <!-- Final Reports -->
                    ${client.Fin_Rep || client.finalReports ? `
                      <div class="subsection">
                        <div class="subsection-title">Final Reports</div>
                        <div class="content">${client.Fin_Rep || client.finalReports}</div>
                      </div>
                    ` : ''}
                    
                    <!-- Final Processing -->
                    ${client.Processing || client.processing ? `
                      <div class="subsection">
                        <div class="subsection-title">Final Processing</div>
                        <div class="content">${client.Processing || client.processing}</div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }
              return '';
            })()}
            
            <!-- Show message if no form data is available -->
            ${(() => {
              const hasAnyFormData = client.Pre_Inv || client.preInventory ||
                                   client['Team-Instr'] || client.Team_Instr ||
                                   client.Inv_Proc || client.inventoryProcedures ||
                                   client.Audits || client.Audits_Inv_Flow ||
                                   client.Inv_Flow || client.inventoryFlow ||
                                   client.noncount || client.Non_Count ||
                                   client.Prog_Rep || client.progressiveReports ||
                                   client.Finalize || client.Fin_Count ||
                                   client.Fin_Rep || client.finalReports ||
                                   client.Processing || client.processing;
              
              if (!hasAnyFormData) {
                return `
                  <div class="avoid-break" style="margin-top: 30px; padding: 20px; border: 2px solid #f39c12; background-color: #fff3cd; border-radius: 8px;">
                    <div class="section-title" style="color: #856404; margin-top: 0;">⚠️ No Form Data Available</div>
                    <div class="content" style="color: #856404;">
                      This client record exists in the database but does not contain completed form data yet. 
                      <br><br>
                      To populate this PDF with actual instructions, please:
                      <br>
                      1. Complete the Pre-Inventory Form
                      <br>
                      2. Fill out the Team Instructions
                      <br>
                      3. Complete the Inventory Procedures
                      <br>
                      4. Fill in other required sections
                      <br><br>
                      Once the forms are completed, this PDF will automatically include all the instruction content.
                    </div>
                  </div>
                `;
              }
              return '';
            })()}

            ${client.Additional_Notes || client.additionalNotes ? `
              <div class="avoid-break">
                <div class="section-title">Additional Notes</div>
                <div class="content">${client.Additional_Notes || client.additionalNotes}</div>
              </div>
            ` : ''}

          </div>
        </body>
      </html>
    `;
  };

  const generateWebPDF = async (html, filename, preview = false) => {
    try {
      // Dynamic import for web-only libraries
      const html2canvas = (await import('html2canvas')).default;
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Apply PDF-optimized styling for web
        Object.assign(tempDiv.style, {
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '8.5in',
          height: 'auto',
          backgroundColor: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: '1.4',
          color: '#333',
          padding: '0.5in',
          margin: '0',
          boxSizing: 'border-box',
          overflow: 'visible',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
          hyphens: 'auto',
          pageBreakInside: 'avoid'
        });
      
      // Add to DOM temporarily
      document.body.appendChild(tempDiv);
      
      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (preview) {
        // For preview, just open HTML in new window
        const newWindow = window.open('', '_blank');
        newWindow.document.write(html);
        newWindow.document.close();
        document.body.removeChild(tempDiv);
        return;
      }
      
      // Use jsPDF with better page break handling
      const jsPDF = (await import('jspdf')).default;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      });
      
      // Convert inches to points (72 points = 1 inch)
      const margin = 36; // 0.5 inch
      const pageWidth = 612; // 8.5 inches
      const pageHeight = 792; // 11 inches
      const contentWidth = pageWidth - (2 * margin); // 540 points
      const contentHeight = pageHeight - (2 * margin); // 720 points
      
      // Set up PDF styling
      pdf.setFont('helvetica');
      pdf.setFontSize(12);
      
      let currentY = margin;
      let pageNumber = 1;
      
      // Helper function to add new page if needed
      const checkPageBreak = (neededHeight) => {
        if (currentY + neededHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          pageNumber++;
          return true;
        }
        return false;
      };
      
      // Helper function to add text with wrapping
      const addText = (text, x, y, options = {}) => {
        const fontSize = options.fontSize || 12;
        const fontStyle = options.fontStyle || 'normal';
        const maxWidth = options.maxWidth || contentWidth;
        
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        
        const lines = pdf.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 1.2;
        
        checkPageBreak(lines.length * lineHeight);
        
        lines.forEach((line, index) => {
          pdf.text(line, x, currentY + (index * lineHeight));
        });
        
        currentY += lines.length * lineHeight;
        return lines.length * lineHeight;
      };
      
      // Add header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      const headerText = 'MSI INVENTORY';
      const headerWidth = pdf.getTextWidth(headerText);
      pdf.text(headerText, (pageWidth - headerWidth) / 2, currentY);
      currentY += 25;
      
      pdf.setFontSize(16);
      const titleText = 'ACCOUNT INSTRUCTIONS:';
      const titleWidth = pdf.getTextWidth(titleText);
      pdf.text(titleText, (pageWidth - titleWidth) / 2, currentY);
      currentY += 20;
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      const clientNameText = currentClientData.name;
      const clientNameWidth = pdf.getTextWidth(clientNameText);
      pdf.text(clientNameText, (pageWidth - clientNameWidth) / 2, currentY);
      currentY += 30;
      
      // Client name and generated date removed as requested
      // (Client name is already shown in the header)
      
      // Add sections based on available data
      const sections = [
        { 
          title: 'PRE-INVENTORY INSTRUCTIONS', 
          content: currentClientData.Pre_Inv || currentClientData.preInventory 
        },
        { 
          title: 'INVENTORY PROCEDURES', 
          content: currentClientData.Inv_Proc 
        },
        { 
          title: 'AUDITS', 
          content: currentClientData.Audits 
        },
        { 
          title: 'INVENTORY FLOW', 
          content: currentClientData.Inv_Flow 
        },
        { 
          title: 'PRE-INVENTORY TEAM INSTRUCTIONS', 
          content: currentClientData['Team-Instr'] 
        },
        { 
          title: 'NON-COUNT PRODUCTS', 
          content: currentClientData.noncount 
        },
        { 
          title: 'PROGRESSIVE REPORTS', 
          content: currentClientData.Prog_Rep 
        },
        { 
          title: 'FINALIZING COUNT', 
          content: currentClientData.Finalize 
        },
        { 
          title: 'FINAL REPORTS', 
          content: currentClientData.Fin_Rep 
        },
        { 
          title: 'FINAL PROCESSING', 
          content: currentClientData.Processing 
        }
      ];
      
      sections.forEach(section => {
        if (section.content && section.content.trim()) {
          // Add section title
          checkPageBreak(40);
          currentY += 10;
          addText(section.title, margin, currentY, { fontSize: 16, fontStyle: 'bold' });
          currentY += 10;
          
          // Add section content
          addText(section.content, margin, currentY);
          currentY += 15;
        }
      });
      
      // If no content, show message
      if (!sections.some(s => s.content && s.content.trim())) {
        checkPageBreak(100);
        currentY += 20;
        addText('⚠️ NO FORM DATA AVAILABLE', margin, currentY, { fontSize: 16, fontStyle: 'bold' });
        currentY += 20;
        addText('This client record exists but does not contain completed form data yet. To populate this PDF with actual instructions, please complete the required forms in the app.', margin, currentY);
      }
      
      // Save PDF to device (download only)
      pdf.save(filename);
      
      console.log('✅ UNIVERSAL PDF GENERATOR (WEB): PDF saved to device');
      
    } catch (error) {
      console.error('❌ UNIVERSAL PDF GENERATOR (WEB): Error:', error);
      throw error;
    }
  };

  const generatePDF = async (preview = false) => {
    const currentClientData = getCurrentClientData();
    
    console.log('🎯 generatePDF called with:', {
      preview,
      clientId,
      hasClientData: !!clientData,
      hasFetchedClientData: !!fetchedClientData,
      hasCurrentClientData: !!currentClientData,
      currentClientDataName: currentClientData?.name
    });
    
    if (!currentClientData) {
      console.error('❌ No client data available for PDF generation');
      Alert.alert('Error', 'No client data available');
      return;
    }

    console.log('📄 About to generate PDF with client data:', currentClientData);
    setGenerating(true);

    try {
      console.log('🎯 UNIVERSAL PDF GENERATOR: Generating PDF...');
      console.log('Platform:', Platform.OS);
      console.log('Client data:', currentClientData);
      
      const html = generateUniversalHTML(currentClientData);
      
      if (Platform.OS === 'web') {
        // Use web-specific PDF generation
        const filename = `${customTitle.toLowerCase().replace(/\s+/g, '-')}-${currentClientData.name}.pdf`;
        await generateWebPDF(html, filename, preview);
        
        if (!preview) {
          Alert.alert('Success', 'PDF downloaded successfully!');
        }
        
      } else {
        // Use expo-print for mobile platforms
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

        console.log('✅ UNIVERSAL PDF GENERATOR: PDF generated successfully:', uri);

        if (preview) {
          await sharePDF(uri);
        } else if (autoDownload) {
          await sharePDF(uri);
          if (onComplete) onComplete();
        } else {
          Alert.alert(
            'PDF Generated!',
            `${customTitle} PDF has been generated for ${currentClientData.name}`,
            [
              { text: 'Share', onPress: () => sharePDF(uri) },
              { text: 'OK', onPress: () => {
                if (emailAfterGeneration) {
                  handleEmailAfterGeneration(currentClientData, uri);
                }
                if (onComplete) onComplete();
              }}
            ]
          );
        }
      }

    } catch (error) {
      console.error('❌ UNIVERSAL PDF GENERATOR: Error generating PDF:', error);
      Alert.alert('Error', `Failed to generate PDF: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailAfterGeneration = async (clientData, pdfUri) => {
    console.log('📧 Email functionality would be triggered here');
    console.log('Client:', clientData.name, 'PDF:', pdfUri);
    
    Alert.alert(
      'Email Notification', 
      `PDF will be automatically sent to ${clientData.email} within 48 hours.`
    );
  };

  const sharePDF = async (fileUri) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share PDF');
    }
  };

  const currentClientData = getCurrentClientData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading client data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Universal PDF Generator</Text>
        <Text style={styles.subtitle}>0.5" margins • Professional formatting • One generator for all PDFs</Text>
      </View>

      {currentClientData && (
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{currentClientData.name || 'Unknown Client'}</Text>
          <Text style={styles.clientEmail}>{currentClientData.email || 'No email provided'}</Text>
        </View>
      )}

      {/* Single row with all three buttons */}
      <View style={styles.navigationContainer}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[
            styles.generateButton,
            (generating || !currentClientData) && styles.disabledButton
          ]} 
          onPress={() => {
            console.log('🔘 Generate button pressed', {
              generating,
              hasCurrentClientData: !!currentClientData,
              disabled: generating || !currentClientData
            });
            if (!generating && currentClientData) {
              generatePDF(false);
            }
          }}
          disabled={generating || !currentClientData}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Generate PDF {!currentClientData ? '(No Data)' : ''}
            </Text>
          )}
        </TouchableOpacity>

        {onComplete && (
          <TouchableOpacity style={styles.completeButton} onPress={() => {
            // Navigate back to dashboard
            if (onBack) {
              onBack(); // Go back to previous screen (dashboard)
            } else if (onComplete) {
              onComplete(); // Call the completion handler
            }
          }}>
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  clientInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  clientEmail: {
    fontSize: 16,
    color: '#666',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    flex: 2,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UniversalPDFGenerator;
