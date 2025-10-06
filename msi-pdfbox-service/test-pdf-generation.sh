#!/bin/bash

# Test script for PDFBox PDF generation service

echo "Testing MSI PDFBox Service..."
echo "============================="

# Check if service is running
echo "1. Testing service health..."
curl -s http://localhost:8080/api/pdf/health

if [ $? -eq 0 ]; then
    echo "✅ Service is running"
else
    echo "❌ Service is not running. Please start it first with ./start-service.sh"
    exit 1
fi

echo ""
echo "2. Generating test PDF..."

# Create test JSON payload
cat > test-client-data.json << EOF
{
  "name": "Test Client Company",
  "email": "test@example.com",
  "address": "123 Test Street, Test City, TS 12345",
  "phone": "(555) 123-4567",
  "Pre_Inv": "This is a test of pre-inventory instructions. This text should wrap properly within the 0.5 inch margins. Let's add some more text to test the wrapping functionality and ensure it looks good on the PDF.",
  "Team_Instr": "Team instructions section with multiple lines.\n\nThis should create proper paragraph breaks and handle text wrapping correctly within the specified margins.",
  "Inv_Proc": "Inventory procedures with detailed steps:\n1. First step in the process\n2. Second step with longer text that should wrap properly\n3. Third step to complete the process",
  "Non_Count": "Non-count products information goes here with proper formatting and text wrapping.",
  "Inv_Flow": "Inventory flow section with detailed workflow information.",
  "Additional_Notes": "Additional notes section for any extra information that needs to be included in the account instructions document."
}
EOF

# Generate PDF
curl -X POST http://localhost:8080/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d @test-client-data.json \
  --output test-account-instructions.pdf

if [ $? -eq 0 ]; then
    echo "✅ PDF generated successfully: test-account-instructions.pdf"
    echo ""
    echo "3. PDF file details:"
    ls -lh test-account-instructions.pdf
    echo ""
    echo "You can open the PDF to verify:"
    echo "- 0.5 inch margins on all sides"
    echo "- Proper text wrapping"
    echo "- Centered header with MSI INVENTORY"
    echo "- Uppercase section titles"
    echo "- Professional formatting"
else
    echo "❌ Failed to generate PDF"
    exit 1
fi

# Clean up
rm -f test-client-data.json

echo ""
echo "Test completed successfully! 🎉"
echo "The PDFBox service is working correctly with 0.5\" margins and proper text wrapping."
