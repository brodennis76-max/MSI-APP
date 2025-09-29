import React, { useState } from 'react';
import ProgressiveReportsForm from './ProgressiveReportsForm';
import FinalizingCountForm from './FinalizingCountForm';
import FinalReportsForm from './FinalReportsForm';
import FinalProcessingForm from './FinalProcessingForm';
import CompletionScreen from './CompletionScreen';

const ReportsSection = ({ clientData, onBack, onComplete }) => {
  const [currentReport, setCurrentReport] = useState('progressive');
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);

  const handleNext = () => {
    switch (currentReport) {
      case 'progressive':
        setCurrentReport('finalizing');
        break;
      case 'finalizing':
        setCurrentReport('final');
        break;
      case 'final':
        setCurrentReport('processing');
        break;
      case 'processing':
        setShowCompletionScreen(true);
        break;
      default:
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
