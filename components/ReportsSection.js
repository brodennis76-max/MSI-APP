import React, { useState, useEffect } from 'react';
import ProgressiveReportsForm from './ProgressiveReportsForm';
import FinalizingCountForm from './FinalizingCountForm';
import FinalReportsForm from './FinalReportsForm';
import FinalProcessingForm from './FinalProcessingForm';
import CompletionScreen from './CompletionScreen';

const ReportsSection = ({ clientData, onBack, onComplete }) => {
  const [currentReport, setCurrentReport] = useState('progressive');
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log('ReportsSection: State changed - currentReport:', currentReport, 'showCompletionScreen:', showCompletionScreen);
  }, [currentReport, showCompletionScreen]);

  const handleNext = () => {
    console.log('ReportsSection: handleNext called, currentReport:', currentReport);
    console.log('ReportsSection: showCompletionScreen:', showCompletionScreen);
    switch (currentReport) {
      case 'progressive':
        console.log('ReportsSection: Advancing from progressive to finalizing');
        setCurrentReport('finalizing');
        break;
      case 'finalizing':
        console.log('ReportsSection: Advancing from finalizing to final');
        setCurrentReport('final');
        break;
      case 'final':
        console.log('ReportsSection: Advancing from final to processing');
        setCurrentReport('processing');
        break;
      case 'processing':
        console.log('ReportsSection: Advancing from processing to completion screen');
        setShowCompletionScreen(true);
        break;
      default:
        console.log('ReportsSection: Default case, calling onComplete');
        onComplete();
    }
  };

  const handleBack = () => {
    switch (currentReport) {
      case 'progressive':
        onBack();
        break;
      case 'finalizing':
        setCurrentReport('progressive');
        break;
      case 'final':
        setCurrentReport('finalizing');
        break;
      case 'processing':
        setCurrentReport('final');
        break;
      default:
        onBack();
    }
  };

  // Show Completion Screen if needed
  if (showCompletionScreen) {
    return (
      <CompletionScreen 
        clientData={clientData}
        onComplete={onComplete}
      />
    );
  }

  switch (currentReport) {
    case 'progressive':
      return (
        <ProgressiveReportsForm 
          clientData={clientData}
          onBack={handleBack}
          onComplete={handleNext}
        />
      );
    case 'finalizing':
      return (
        <FinalizingCountForm 
          clientData={clientData}
          onBack={handleBack}
          onComplete={handleNext}
        />
      );
    case 'final':
      return (
        <FinalReportsForm 
          clientData={clientData}
          onBack={handleBack}
          onComplete={handleNext}
        />
      );
    case 'processing':
      return (
        <FinalProcessingForm 
          clientData={clientData}
          onBack={handleBack}
          onComplete={handleNext}
        />
      );
    default:
      return null;
  }
};

export default ReportsSection;
