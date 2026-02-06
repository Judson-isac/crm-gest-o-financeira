import { HtmlExtractor } from "@/app/components/html-extractor";
import { FileScan } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 text-center">
            <div className="inline-flex items-center justify-center rounded-lg bg-primary p-3 mb-4 shadow-md">
              <FileScan className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              HTML Data Extractor
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Paste your HTML report below to automatically extract and structure your data.
            </p>
          </header>
          <HtmlExtractor />
        </div>
      </main>
    </div>
  );
}
