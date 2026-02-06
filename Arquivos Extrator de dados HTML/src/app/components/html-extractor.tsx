'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { extractDataFromHtml } from '@/lib/extractor';
import type { ExtractedData } from '@/lib/extractor';
import { ResultsDisplay } from '@/app/components/results-display';
import { useToast } from '@/hooks/use-toast';

export function HtmlExtractor() {
  const [htmlContent, setHtmlContent] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleProcessHtml = async () => {
    if (!htmlContent) {
        toast({
            title: "Input missing",
            description: "Please paste your HTML content before processing.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true);
    setExtractedData(null);

    try {
      // Delay for UX purposes to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = extractDataFromHtml(htmlContent);
      setExtractedData(data);
    } catch (error) {
      console.error('An error occurred during processing:', error);
      toast({
        title: "Processing Error",
        description: "An unexpected error occurred during HTML parsing. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Textarea
          placeholder="Paste your raw HTML here..."
          className="min-h-[250px] w-full rounded-lg border-2 border-dashed bg-card p-4 text-sm font-code shadow-inner focus:border-primary"
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
        />
        <Button onClick={handleProcessHtml} disabled={isLoading} className="w-full sm:w-auto text-base">
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          <span>{isLoading ? 'Processing...' : 'Extract Data'}</span>
        </Button>
      </div>

      <ResultsDisplay isLoading={isLoading} extractedData={extractedData} />
    </div>
  );
}
