# MSI PDFBox Service

A Spring Boot service that generates high-quality PDF documents using Apache PDFBox for the MSI application.

## Features

- ✅ High-quality PDF generation using Apache PDFBox
- ✅ RESTful API for easy integration
- ✅ Support for account instructions with multiple sections
- ✅ Automatic text wrapping and page breaks
- ✅ Professional formatting with headers, footers, and styling
- ✅ CORS support for web applications
- ✅ Health check endpoint

## Prerequisites

- Java 17 or higher
- Maven 3.6 or higher

## Quick Start

### 1. Start the Service

```bash
# Make the startup script executable (if not already done)
chmod +x start-service.sh

# Start the service
./start-service.sh
```

The service will be available at `http://localhost:8080`

### 2. Test the Service

```bash
# Health check
curl http://localhost:8080/api/pdf/health

# Should return: "PDF service is running"
```

### 3. Generate a PDF

```bash
curl -X POST http://localhost:8080/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "email": "test@example.com",
    "Pre_Inv": "Pre-inventory instructions here",
    "Team_Instr": "Team instructions here"
  }' \
  --output test-account-instructions.pdf
```

## API Endpoints

### POST /api/pdf/generate
Generates and downloads a PDF file.

**Request Body:**
```json
{
  "name": "Client Name",
  "email": "client@example.com",
  "address": "Client Address (optional)",
  "phone": "Client Phone (optional)",
  "Pre_Inv": "Pre-inventory instructions",
  "Team_Instr": "Team instructions",
  "Inv_Proc": "Inventory procedures",
  "Non_Count": "Non-count products",
  "Inv_Flow": "Inventory flow",
  "Audits_Inv_Flow": "Audits inventory flow",
  "Fin_Count": "Finalizing count",
  "Prog_Rep": "Progressive reports",
  "Fin_Rep": "Final reports",
  "Processing": "Processing instructions",
  "Additional_Notes": "Additional notes"
}
```

**Response:** PDF file download

### POST /api/pdf/preview
Generates a PDF for inline preview (opens in browser).

**Request Body:** Same as `/generate`

**Response:** PDF file for inline viewing

### GET /api/pdf/health
Health check endpoint.

**Response:** "PDF service is running"

## Integration with React Native

### 1. Update your React Native component

Replace your existing PDF generator with the new `PDFBoxGenerator` component:

```javascript
import PDFBoxGenerator from './components/PDFBoxGenerator';

// In your component
<PDFBoxGenerator 
  clientData={clientData}
  onComplete={handleComplete}
  onBack={handleBack}
/>
```

### 2. Update the service URL

In `PDFBoxGenerator.js`, update the `PDF_SERVICE_URL` constant:

```javascript
// For development
const PDF_SERVICE_URL = 'http://localhost:8080/api/pdf';

// For production (replace with your server IP/domain)
const PDF_SERVICE_URL = 'http://your-server-ip:8080/api/pdf';
```

### 3. Test the integration

1. Start the PDFBox service
2. Run your React Native app
3. Use the "Test Connection" button to verify connectivity
4. Generate PDFs using the new service

## Configuration

### Application Properties

Edit `src/main/resources/application.properties` to customize:

```properties
# Change the port
server.port=8080

# Enable debug logging
logging.level.com.msi.pdfbox=DEBUG

# Adjust file size limits
spring.servlet.multipart.max-file-size=10MB
```

### CORS Configuration

The service is configured to allow all origins for development. For production, update `CorsConfig.java`:

```java
// Restrict to specific origins in production
configuration.setAllowedOriginPatterns(Arrays.asList("https://yourdomain.com"));
```

## Deployment

### Local Development
```bash
./start-service.sh
```

### Production Deployment

1. **Build the JAR:**
```bash
mvn clean package
```

2. **Run the JAR:**
```bash
java -jar target/pdfbox-service-1.0.0.jar
```

3. **With custom configuration:**
```bash
java -jar target/pdfbox-service-1.0.0.jar --server.port=8080
```

### Docker Deployment (Optional)

Create a `Dockerfile`:
```dockerfile
FROM openjdk:17-jdk-slim
COPY target/pdfbox-service-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

Build and run:
```bash
docker build -t msi-pdfbox-service .
docker run -p 8080:8080 msi-pdfbox-service
```

## Troubleshooting

### Common Issues

1. **Service won't start**
   - Check Java version: `java -version` (need Java 17+)
   - Check Maven: `mvn -version`
   - Check port availability: `lsof -i :8080`

2. **Connection refused from React Native**
   - Ensure service is running: `curl http://localhost:8080/api/pdf/health`
   - Update IP address in `PDFBoxGenerator.js` for mobile testing
   - Check firewall settings

3. **PDF generation fails**
   - Check service logs for errors
   - Verify request payload format
   - Test with curl first

### Logs

Service logs are printed to console. For file logging, add to `application.properties`:
```properties
logging.file.name=pdfbox-service.log
```

## Advantages over Previous Solutions

- **Better Performance:** Native Java PDF generation is faster than HTML-to-PDF conversion
- **Consistent Output:** PDFBox produces consistent results across all platforms
- **Professional Quality:** Better typography, spacing, and layout control
- **Reliability:** No dependency on browser engines or external services
- **Scalability:** Can handle high-volume PDF generation
- **Customization:** Easy to modify layout, fonts, and styling

## Support

For issues or questions:
1. Check the logs for error messages
2. Test the health endpoint
3. Verify your request payload matches the expected format
4. Ensure all required fields are provided
