import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentOcrScanner } from "@/components/ai/DocumentOcrScanner";
import { NaturalLanguageInput } from "@/components/ai/NaturalLanguageInput";
import { SmartCategorization } from "@/components/ai/SmartCategorization";
import { PredictiveInsights } from "@/components/ai/PredictiveInsights";
import { AiIndicator } from "@/components/shared/AiIndicator";
import { useAiAssist } from "@/hooks/useAiAssist";
import { ScanLine, MessageSquare, Tags, Brain, Sparkles } from "lucide-react";

export default function AiHub() {
  const { language } = useLanguage();
  const { config, getRemainingCalls, isAvailable, loading } = useAiAssist();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {language === "bn" ? "AI হাব" : "AI Hub"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === "bn"
                ? "AI দিয়ে ডকুমেন্ট স্ক্যান, স্মার্ট ক্যাটাগরাইজেশন, পূর্বাভাস এবং প্রাকৃতিক ভাষায় কাজ তৈরি।"
                : "Document OCR, smart categorization, predictive insights & natural language tasks."}
            </p>
          </div>

          <AiIndicator
            provider={config?.provider}
            remaining={getRemainingCalls()}
            loading={loading}
            unavailable={!isAvailable}
            className="self-start"
          />
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {language === "bn" ? "AI স্ট্যাটাস" : "AI Status"}
                </span>
                <AiIndicator
                  variant="inline"
                  provider={config?.provider}
                  remaining={getRemainingCalls()}
                  loading={loading}
                  unavailable={!isAvailable}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {!isAvailable
                  ? language === "bn"
                    ? "সেলফ-হোস্টেড মোডে AI ফিচার সীমিত বা অনুপলব্ধ। ক্লাউড মোডে আরও ভালো AI প্রোডাক্টিভিটি ফিচার ব্যবহার করতে পারবেন।"
                    : "AI features are limited or unavailable in self-hosted mode. Use cloud mode for richer AI productivity features."
                  : getRemainingCalls() !== null
                    ? language === "bn"
                      ? `আজকের জন্য আপনার ফ্রি AI ব্যবহারের বাকি আছে ${getRemainingCalls()} বার।`
                      : `You have ${getRemainingCalls()} free AI calls remaining today.`
                    : language === "bn"
                      ? "আপনার AI প্রোভাইডার কনফিগার করা আছে এবং উন্নত AI ফিচার ব্যবহারযোগ্য।"
                      : "Your AI provider is configured and advanced AI features are available."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="nlp" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="nlp"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === "bn" ? "NLP" : "NLP"}
            </span>
            <AiIndicator
              variant="dot"
              loading={loading}
              provider={config?.provider}
              unavailable={!isAvailable}
            />
          </TabsTrigger>
          <TabsTrigger
            value="ocr"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === "bn" ? "OCR" : "OCR"}
            </span>
            <AiIndicator
              variant="dot"
              loading={loading}
              provider={config?.provider}
              unavailable={!isAvailable}
            />
          </TabsTrigger>
          <TabsTrigger
            value="categorize"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Tags className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === "bn" ? "ক্যাটাগরি" : "Categorize"}
            </span>
            <AiIndicator
              variant="dot"
              loading={loading}
              provider={config?.provider}
              unavailable={!isAvailable}
            />
          </TabsTrigger>
          <TabsTrigger
            value="predict"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === "bn" ? "পূর্বাভাস" : "Predict"}
            </span>
            <AiIndicator
              variant="dot"
              loading={loading}
              provider={config?.provider}
              unavailable={!isAvailable}
            />
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
