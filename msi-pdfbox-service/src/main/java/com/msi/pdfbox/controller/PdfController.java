package com.msi.pdfbox.controller;

import com.msi.pdfbox.model.ClientData;
import com.msi.pdfbox.service.PdfGenerationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/pdf")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PdfController {
    
    @Autowired
    private PdfGenerationService pdfGenerationService;
    
    @PostMapping("/generate")
    public ResponseEntity<byte[]> generatePdf(@Valid @RequestBody ClientData clientData) {
        try {
            byte[] pdfBytes = pdfGenerationService.generateAccountInstructionsPdf(clientData);
            
            // Create filename with client name and timestamp
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = String.format("account-instructions-%s-%s.pdf", 
                clientData.getName().replaceAll("[^a-zA-Z0-9]", "_"), timestamp);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
            
        } catch (IOException e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @PostMapping("/preview")
    public ResponseEntity<byte[]> previewPdf(@Valid @RequestBody ClientData clientData) {
        try {
            byte[] pdfBytes = pdfGenerationService.generateAccountInstructionsPdf(clientData);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "preview.pdf");
            headers.setContentLength(pdfBytes.length);
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
            
        } catch (IOException e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("PDF service is running");
    }
}
