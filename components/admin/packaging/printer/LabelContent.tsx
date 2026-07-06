
import React from 'react';
import { LabelData, ThemeType } from './types';
import FlexiLabel from './FlexiLabel';
import FlexiHorizontalLabel from './FlexiHorizontalLabel';
import FlexiMinimalLabel from './FlexiMinimalLabel';
import AccLabel from './AccLabel';

interface LabelContentProps {
  data: LabelData;
  theme: ThemeType;
  lineLeft: number;
  lineRight: number;
  qrValue: string;
  isDesignMode: boolean;
  printDensity: number;
  watermarkIntensity: number;
  flexiTemplate?: string;
}

const LabelContent: React.FC<LabelContentProps> = ({ 
  data, 
  theme, 
  qrValue, 
  isDesignMode, 
  printDensity, 
  watermarkIntensity,
  flexiTemplate = 'vertical'
}) => {
  if (theme === ThemeType.FLEXI) {
    if (flexiTemplate === 'horizontal') {
      return <FlexiHorizontalLabel data={data} qrValue={qrValue} isDesignMode={isDesignMode} printDensity={printDensity} watermarkIntensity={watermarkIntensity} />;
    } else if (flexiTemplate === 'minimal') {
      return <FlexiMinimalLabel data={data} qrValue={qrValue} isDesignMode={isDesignMode} printDensity={printDensity} watermarkIntensity={watermarkIntensity} />;
    }
    return <FlexiLabel data={data} qrValue={qrValue} isDesignMode={isDesignMode} printDensity={printDensity} watermarkIntensity={watermarkIntensity} />;
  }
  return <AccLabel data={data} qrValue={qrValue} isDesignMode={isDesignMode} printDensity={printDensity} watermarkIntensity={watermarkIntensity} />;
};

export default LabelContent;

