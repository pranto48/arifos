import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentOcrScanner } from '@/components/ai/DocumentOcrScanner';
import { NaturalLanguageInput } from '@/components/ai/NaturalLanguageInput';
import { SmartCategorization } from '@/components/ai/SmartCategorization';
import { PredictiveInsights } from '@/components/ai/PredictiveInsights';
import { ScanLine, MessageSquare, Tags, Brain } from 'lucide-react';

export default function AiHub() {
  const { language } = useLanguage();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {language === 'bn' ? 'AI হাব' : 'AI Hub'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {language === 'bn'
            ? 'AI দিয়ে ডকুমেন্ট স্ক্যান, স্মার্ট ক্যাটাগরাইজেশন, পূর্বাভাস এবং প্রাকৃতিক ভাষায় কাজ তৈরি।'
            : 'Document OCR, smart categorization, predictive insights & natural language tasks.'}
        </p>
      </div>

      <Tabs defaultValue="nlp" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="nlp" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'NLP' : 'NLP'}</span>
          </TabsTrigger>
          <TabsTrigger value="ocr" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'OCR' : 'OCR'}</span>
          </TabsTrigger>
          <TabsTrigger value="categorize" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Tags className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ক্যাটাগরি' : 'Categorize'}</span>
          </TabsTrigger>
          <TabsTrigger value="predict" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'পূর্বাভাস' : 'Predict'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nlp" className="mt-4">
          <NaturalLanguageInput />
        </TabsContent>

        <TabsContent value="ocr" className="mt-4">
          <DocumentOcrScanner />
        </TabsContent>

        <TabsContent value="categorize" className="mt-4">
          <SmartCategorization />
        </TabsContent>

        <TabsContent value="predict" className="mt-4">
          <PredictiveInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
}
