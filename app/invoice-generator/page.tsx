import { Suspense } from "react"
import InvoiceGeneratorForm from "@/components/invoice-generator-form"
import { ThemeToggle } from "@/components/theme-toggle"

export default function InvoiceGenerator() {
  return (
      <main className="container mx-auto py-6 sm:py-10 px-4">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Invoice Generator</h1>
          <ThemeToggle />
        </div>
        <Suspense fallback={null}>
          <InvoiceGeneratorForm />
        </Suspense>
      </main>
  );
};
