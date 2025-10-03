import React from 'react';
import { View, StyleSheet } from 'react-native';
import ImprovedPDFGenerator from './components/ImprovedPDFGenerator';

// Test data that matches your existing client data structure
const testClientData = {
  name: "Test Client Company",
  email: "test@example.com",
  address: "123 Test Street, Test City, TS 12345",
  phone: "(555) 123-4567",
  inventoryType: "Scan",
  PIC: "John Smith",
  startTime: "8:00 AM",
  verification: "Verified",
  updatedAt: new Date(),
  Pre_Inv: `This is a test of pre-inventory instructions with proper text wrapping. This text should wrap correctly within the 0.5 inch margins and maintain professional formatting.

Here's a second paragraph to test paragraph breaks and ensure proper spacing between sections. The text should flow naturally and be easy to read.`,
  
  Team_Instr: `Team instructions section with multiple lines and detailed information.

1. First instruction with detailed explanation
2. Second instruction that may be longer and require text wrapping
3. Third instruction to complete the process

Additional notes and information for the team members.`,
  
  Inv_Proc: `Inventory procedures with step-by-step instructions:

• Step one: Initial setup and preparation
• Step two: Data collection and verification  
• Step three: Quality control and validation
• Step four: Final review and submission

Please ensure all procedures are followed carefully.`,
  
  Non_Count: "Non-count products information with detailed descriptions and special handling instructions that may require multiple lines of text.",
  
  Inv_Flow: `Inventory flow process:

Start → Data Entry → Verification → Quality Check → Final Report

Each step must be completed before proceeding to the next phase.`,
  
  Audits_Inv_Flow: "Audits inventory flow section with comprehensive workflow information and detailed step-by-step procedures.",
  
  Fin_Count: "Finalizing count procedures with specific instructions for completing the inventory process.",
  
  Prog_Rep: "Progressive reports section with information about ongoing reporting requirements and schedules.",
  
  Fin_Rep: "Final reports section detailing the completion requirements and submission procedures.",
  
  Processing: "Final processing instructions with complete workflow and submission requirements.",
  
  Additional_Notes: `Additional notes section for any extra information:

• Important deadlines and timelines
• Contact information for questions
• Special requirements or exceptions
• Emergency procedures and contacts

Please review all information carefully before proceeding.`
};

const TestImprovedPDF = () => {
  const handleComplete = () => {
    console.log('PDF generation completed');
  };

  const handleBack = () => {
    console.log('Back button pressed');
  };

  return (
    <View style={styles.container}>
      <ImprovedPDFGenerator
        clientData={testClientData}
        onComplete={handleComplete}
        onBack={handleBack}
        showPreview={true}
        customTitle="Account Instructions"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default TestImprovedPDF;
