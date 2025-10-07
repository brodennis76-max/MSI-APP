package com.msi.pdfbox.service;

import com.msi.pdfbox.model.ClientData;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class PdfGenerationService {
    
    // 0.5 inch margins (36 points = 0.5 inch at 72 DPI)
    private static final float MARGIN = 36;
    private static final float PAGE_WIDTH = PDRectangle.LETTER.getWidth();
    private static final float PAGE_HEIGHT = PDRectangle.LETTER.getHeight();
    private static final float CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
    
    private static final PDType1Font FONT_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private static final PDType1Font FONT_REGULAR = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDType1Font FONT_ITALIC = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);
    
    public byte[] generateAccountInstructionsPdf(ClientData clientData) throws IOException {
        try (PDDocument document = new PDDocument()) {
            
            // Create first page
            PDPage page = new PDPage(PDRectangle.LETTER);
            document.addPage(page);
            
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                float yPosition = PAGE_HEIGHT - MARGIN;
                
                // Add header with logo placeholder and title
                yPosition = addHeader(contentStream, clientData.getName(), yPosition);
                
                // Client information section removed as requested
                
                // Add account instructions sections
                yPosition = addAccountInstructions(document, contentStream, clientData, yPosition);
                
                // Add footer
                addFooter(contentStream);
            }
            
            // Convert to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            return outputStream.toByteArray();
        }
    }
    
    private float addHeader(PDPageContentStream contentStream, String clientName, float yPosition) throws IOException {
        // MSI INVENTORY - Company name (centered)
        String companyName = "MSI INVENTORY";
        float companyNameWidth = FONT_BOLD.getStringWidth(companyName) / 1000 * 18;
        float companyNameX = (PAGE_WIDTH - companyNameWidth) / 2;
        
        contentStream.beginText();
        contentStream.setFont(FONT_BOLD, 18);
        contentStream.newLineAtOffset(companyNameX, yPosition);
        contentStream.showText(companyName);
        contentStream.endText();
        
        yPosition -= 25;
        
        // ACCOUNT INSTRUCTIONS: (centered)
        String titleText = "ACCOUNT INSTRUCTIONS:";
        float titleWidth = FONT_BOLD.getStringWidth(titleText) / 1000 * 16;
        float titleX = (PAGE_WIDTH - titleWidth) / 2;
        
        contentStream.beginText();
        contentStream.setFont(FONT_BOLD, 16);
        contentStream.newLineAtOffset(titleX, yPosition);
        contentStream.showText(titleText);
        contentStream.endText();
        
        yPosition -= 25;
        
        // Client name (centered)
        float clientNameWidth = FONT_REGULAR.getStringWidth(clientName) / 1000 * 14;
        float clientNameX = (PAGE_WIDTH - clientNameWidth) / 2;
        
        contentStream.beginText();
        contentStream.setFont(FONT_REGULAR, 14);
        contentStream.newLineAtOffset(clientNameX, yPosition);
        contentStream.showText(clientName);
        contentStream.endText();
        
        yPosition -= 30;
        
        return yPosition;
    }
    
    private float addClientInfo(PDPageContentStream contentStream, ClientData clientData, float yPosition) throws IOException {
        yPosition = addSectionTitle(contentStream, "Client Information", yPosition);
        
        if (clientData.getName() != null) {
            yPosition = addField(contentStream, "Name", clientData.getName(), yPosition);
        }
        
        if (clientData.getEmail() != null) {
            yPosition = addField(contentStream, "Email", clientData.getEmail(), yPosition);
        }
        
        if (clientData.getAddress() != null) {
            yPosition = addField(contentStream, "Address", clientData.getAddress(), yPosition);
        }
        
        if (clientData.getPhone() != null) {
            yPosition = addField(contentStream, "Phone", clientData.getPhone(), yPosition);
        }
        
        if (clientData.getInventoryType() != null) {
            yPosition = addField(contentStream, "Inventory", clientData.getInventoryType(), yPosition);
        }
        
        if (clientData.getPIC() != null) {
            yPosition = addField(contentStream, "PIC", clientData.getPIC(), yPosition);
        }
        
        if (clientData.getStartTime() != null) {
            yPosition = addField(contentStream, "Store Start Time", clientData.getStartTime(), yPosition);
        }
        
        if (clientData.getVerification() != null) {
            yPosition = addField(contentStream, "Verification", clientData.getVerification(), yPosition);
        }
        
        if (clientData.getUpdatedAt() != null) {
            yPosition = addField(contentStream, "Updated", clientData.getUpdatedAt(), yPosition);
        }
        
        return yPosition - 15;
    }
    
    private float addAccountInstructions(PDDocument document, PDPageContentStream contentStream, 
                                       ClientData clientData, float yPosition) throws IOException {
        
        // Pre-Inventory Instructions
        if (clientData.getPreInventory() != null && !clientData.getPreInventory().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Pre-Inventory Instructions", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getPreInventory(), yPosition);
        }
        
        // Team Instructions
        if (clientData.getTeamInstructions() != null && !clientData.getTeamInstructions().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Team Instructions", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getTeamInstructions(), yPosition);
        }
        
        // Inventory Procedures
        if (clientData.getInventoryProcedures() != null && !clientData.getInventoryProcedures().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Inventory Procedures", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getInventoryProcedures(), yPosition);
        }
        
        // Non-Count Products
        if (clientData.getNonCountProducts() != null && !clientData.getNonCountProducts().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Non-Count Products", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getNonCountProducts(), yPosition);
        }
        
        // Inventory Flow
        if (clientData.getInventoryFlow() != null && !clientData.getInventoryFlow().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Inventory Flow", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getInventoryFlow(), yPosition);
        }
        
        // Audits Inventory Flow
        if (clientData.getAuditsInventoryFlow() != null && !clientData.getAuditsInventoryFlow().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Audits Inventory Flow", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getAuditsInventoryFlow(), yPosition);
        }
        
        // Finalizing Count
        if (clientData.getFinalizingCount() != null && !clientData.getFinalizingCount().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Finalizing Count", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getFinalizingCount(), yPosition);
        }
        
        // Progressive Reports
        if (clientData.getProgressiveReports() != null && !clientData.getProgressiveReports().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Progressive Reports", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getProgressiveReports(), yPosition);
        }
        
        // Final Reports
        if (clientData.getFinalReports() != null && !clientData.getFinalReports().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Final Reports", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getFinalReports(), yPosition);
        }
        
        // Processing
        if (clientData.getProcessing() != null && !clientData.getProcessing().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Final Processing", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getProcessing(), yPosition);
        }
        
        // Additional Notes
        if (clientData.getAdditionalNotes() != null && !clientData.getAdditionalNotes().trim().isEmpty()) {
            yPosition = addSectionTitle(contentStream, "Additional Notes", yPosition);
            yPosition = addTextContent(document, contentStream, clientData.getAdditionalNotes(), yPosition);
        }
        
        return yPosition;
    }
    
    private float addSectionTitle(PDPageContentStream contentStream, String title, float yPosition) throws IOException {
        // Convert title to uppercase to match existing style
        String upperTitle = title.toUpperCase();
        
        contentStream.beginText();
        contentStream.setFont(FONT_BOLD, 16);
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText(upperTitle);
        contentStream.endText();
        
        yPosition -= 15;
        
        return yPosition;
    }
    
    private float addField(PDPageContentStream contentStream, String label, String value, float yPosition) throws IOException {
        // Label
        contentStream.beginText();
        contentStream.setFont(FONT_BOLD, 12);
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText(label + ":");
        contentStream.endText();
        
        yPosition -= 15;
        
        // Value
        contentStream.beginText();
        contentStream.setFont(FONT_REGULAR, 11);
        contentStream.newLineAtOffset(MARGIN + 20, yPosition);
        contentStream.showText(value);
        contentStream.endText();
        
        return yPosition - 20;
    }
    
    private float addTextContent(PDDocument document, PDPageContentStream contentStream, 
                               String text, float yPosition) throws IOException {
        List<String> lines = wrapText(text, FONT_REGULAR, 11, CONTENT_WIDTH - 20);
        
        for (String line : lines) {
            // Check if we need more space
            if (yPosition - 20 < MARGIN + 100) {
                // Not enough space, but we'll continue on this page for now
                // In a more complex implementation, you'd handle page breaks here
            }
            
            contentStream.beginText();
            contentStream.setFont(FONT_REGULAR, 11);
            contentStream.newLineAtOffset(MARGIN + 20, yPosition);
            contentStream.showText(line);
            contentStream.endText();
            
            yPosition -= 15;
        }
        
        return yPosition - 10;
    }
    
    private float checkPageBreak(PDDocument document, PDPageContentStream contentStream, 
                               float yPosition, float requiredSpace) throws IOException {
        // Check if we need a page break (leaving space for footer)
        if (yPosition - requiredSpace < MARGIN + 100) {
            // We need a new page, but we can't close the content stream here
            // Instead, return a flag value that indicates a page break is needed
            return -1; // Special value indicating page break needed
        }
        return yPosition;
    }
    
    private List<String> wrapText(String text, PDType1Font font, float fontSize, float width) throws IOException {
        List<String> lines = new ArrayList<>();
        
        if (text == null || text.trim().isEmpty()) {
            return lines;
        }
        
        // Split by both \n and \r\n to handle different line endings
        String[] paragraphs = text.split("\\r?\\n");
        
        for (String paragraph : paragraphs) {
            if (paragraph.trim().isEmpty()) {
                lines.add("");
                continue;
            }
            
            // Handle very long words by breaking them if necessary
            String[] words = paragraph.split("\\s+");
            StringBuilder currentLine = new StringBuilder();
            
            for (String word : words) {
                // Check if the word itself is too long for the line
                float wordWidth = font.getStringWidth(word) / 1000 * fontSize;
                if (wordWidth > width) {
                    // If current line has content, add it first
                    if (currentLine.length() > 0) {
                        lines.add(currentLine.toString());
                        currentLine = new StringBuilder();
                    }
                    
                    // Break the long word into smaller pieces
                    StringBuilder wordPart = new StringBuilder();
                    for (char c : word.toCharArray()) {
                        String testPart = wordPart.toString() + c;
                        float testWidth = font.getStringWidth(testPart) / 1000 * fontSize;
                        if (testWidth > width && wordPart.length() > 0) {
                            lines.add(wordPart.toString());
                            wordPart = new StringBuilder(String.valueOf(c));
                        } else {
                            wordPart.append(c);
                        }
                    }
                    if (wordPart.length() > 0) {
                        currentLine = wordPart;
                    }
                } else {
                    // Normal word processing
                    String testLine = currentLine.length() == 0 ? word : currentLine + " " + word;
                    float textWidth = font.getStringWidth(testLine) / 1000 * fontSize;
                    
                    if (textWidth > width && currentLine.length() > 0) {
                        lines.add(currentLine.toString());
                        currentLine = new StringBuilder(word);
                    } else {
                        currentLine = new StringBuilder(testLine);
                    }
                }
            }
            
            if (currentLine.length() > 0) {
                lines.add(currentLine.toString());
            }
        }
        
        return lines;
    }
    
    private void addFooter(PDPageContentStream contentStream) throws IOException {
        float footerY = MARGIN + 60; // Position footer higher from bottom
        
        // Contact Information section
        contentStream.beginText();
        contentStream.setFont(FONT_BOLD, 12);
        contentStream.newLineAtOffset(MARGIN, footerY);
        contentStream.showText("CONTACT INFORMATION");
        contentStream.endText();
        
        footerY -= 20;
        
        contentStream.beginText();
        contentStream.setFont(FONT_REGULAR, 11);
        contentStream.newLineAtOffset(MARGIN, footerY);
        contentStream.showText("Email: @msi-inv.com");
        contentStream.endText();
        
        footerY -= 20;
        
        // Note section
        contentStream.beginText();
        contentStream.setFont(FONT_BOLD, 12);
        contentStream.newLineAtOffset(MARGIN, footerY);
        contentStream.showText("NOTE:");
        contentStream.endText();
        
        footerY -= 15;
        
        contentStream.beginText();
        contentStream.setFont(FONT_REGULAR, 11);
        contentStream.newLineAtOffset(MARGIN, footerY);
        contentStream.showText("A completed Account Instructions Form will be sent within 48 hours.");
        contentStream.endText();
        
        footerY -= 15;
        
        contentStream.beginText();
        contentStream.setFont(FONT_REGULAR, 11);
        contentStream.newLineAtOffset(MARGIN, footerY);
        contentStream.showText("Please check your email and spam folder.");
        contentStream.endText();
    }
}
