package com.msi.pdfbox.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;

public class ClientData {
    
    @NotBlank(message = "Client name is required")
    private String name;
    
    @Email(message = "Valid email is required")
    private String email;
    
    private String address;
    private String phone;
    
    // Additional client information fields
    private String inventoryType;
    private String PIC;
    private String startTime;
    private String verification;
    private String updatedAt;
    
    // Account Instructions sections
    @JsonProperty("Pre_Inv")
    private String preInventory;
    
    @JsonProperty("Team_Instr")
    private String teamInstructions;
    
    @JsonProperty("Inv_Proc")
    private String inventoryProcedures;
    
    @JsonProperty("Non_Count")
    private String nonCountProducts;
    
    @JsonProperty("Inv_Flow")
    private String inventoryFlow;
    
    @JsonProperty("Audits_Inv_Flow")
    private String auditsInventoryFlow;
    
    @JsonProperty("Fin_Count")
    private String finalizingCount;
    
    @JsonProperty("Prog_Rep")
    private String progressiveReports;
    
    @JsonProperty("Fin_Rep")
    private String finalReports;
    
    @JsonProperty("Processing")
    private String processing;
    
    @JsonProperty("Additional_Notes")
    private String additionalNotes;
    
    // Constructors
    public ClientData() {}
    
    public ClientData(String name, String email) {
        this.name = name;
        this.email = email;
    }
    
    // Getters and Setters
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }
    
    public String getInventoryType() {
        return inventoryType;
    }
    
    public void setInventoryType(String inventoryType) {
        this.inventoryType = inventoryType;
    }
    
    public String getPIC() {
        return PIC;
    }
    
    public void setPIC(String PIC) {
        this.PIC = PIC;
    }
    
    public String getStartTime() {
        return startTime;
    }
    
    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }
    
    public String getVerification() {
        return verification;
    }
    
    public void setVerification(String verification) {
        this.verification = verification;
    }
    
    public String getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public String getPreInventory() {
        return preInventory;
    }
    
    public void setPreInventory(String preInventory) {
        this.preInventory = preInventory;
    }
    
    public String getTeamInstructions() {
        return teamInstructions;
    }
    
    public void setTeamInstructions(String teamInstructions) {
        this.teamInstructions = teamInstructions;
    }
    
    public String getInventoryProcedures() {
        return inventoryProcedures;
    }
    
    public void setInventoryProcedures(String inventoryProcedures) {
        this.inventoryProcedures = inventoryProcedures;
    }
    
    public String getNonCountProducts() {
        return nonCountProducts;
    }
    
    public void setNonCountProducts(String nonCountProducts) {
        this.nonCountProducts = nonCountProducts;
    }
    
    public String getInventoryFlow() {
        return inventoryFlow;
    }
    
    public void setInventoryFlow(String inventoryFlow) {
        this.inventoryFlow = inventoryFlow;
    }
    
    public String getAuditsInventoryFlow() {
        return auditsInventoryFlow;
    }
    
    public void setAuditsInventoryFlow(String auditsInventoryFlow) {
        this.auditsInventoryFlow = auditsInventoryFlow;
    }
    
    public String getFinalizingCount() {
        return finalizingCount;
    }
    
    public void setFinalizingCount(String finalizingCount) {
        this.finalizingCount = finalizingCount;
    }
    
    public String getProgressiveReports() {
        return progressiveReports;
    }
    
    public void setProgressiveReports(String progressiveReports) {
        this.progressiveReports = progressiveReports;
    }
    
    public String getFinalReports() {
        return finalReports;
    }
    
    public void setFinalReports(String finalReports) {
        this.finalReports = finalReports;
    }
    
    public String getProcessing() {
        return processing;
    }
    
    public void setProcessing(String processing) {
        this.processing = processing;
    }
    
    public String getAdditionalNotes() {
        return additionalNotes;
    }
    
    public void setAdditionalNotes(String additionalNotes) {
        this.additionalNotes = additionalNotes;
    }
}
