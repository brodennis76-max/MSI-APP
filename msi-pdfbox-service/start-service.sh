#!/bin/bash

# MSI PDFBox Service Startup Script

echo "Starting MSI PDFBox Service..."
echo "================================"

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install Java 17 or higher."
    echo "   Download from: https://adoptium.net/"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "❌ Java 17 or higher is required. Current version: $JAVA_VERSION"
    exit 1
fi

echo "✅ Java version check passed"

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "❌ Maven is not installed. Please install Maven."
    echo "   Download from: https://maven.apache.org/download.cgi"
    exit 1
fi

echo "✅ Maven check passed"

# Build the project
echo "🔨 Building the project..."
mvn clean package -DskipTests

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

echo "✅ Build successful"

# Start the service
echo "🚀 Starting PDFBox service..."
echo "   Service will be available at: http://localhost:8080"
echo "   Health check: http://localhost:8080/api/pdf/health"
echo "   Press Ctrl+C to stop the service"
echo ""

java -jar target/pdfbox-service-1.0.0.jar
