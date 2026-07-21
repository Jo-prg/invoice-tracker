"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import InvoiceForm from "@/components/invoice-form"
import InvoicePreview from "@/components/invoice-preview"
import type { InvoiceData } from "@/types/invoice"
import { toast } from "sonner"
import { saveInvoice } from "@/app/actions/saveInvoice"
import { getInvoice } from "@/app/actions/getInvoice"
import { getUserCompany } from "@/app/actions/getUserCompany"
import { useSearchParams, useRouter } from "next/navigation"
import { isGuestMode } from "@/lib/auth/guestMode"
import { getGuestInvoice, saveGuestInvoice, getGuestCompany, setGuestCompany } from "@/lib/auth/guestStorage"

function normalizeColorsForHtml2Canvas(documentClone: Document, element: HTMLElement) {
  // html2canvas reads the cloned document and body backgrounds before it
  // decides whether to use foreignObjectRendering. Keep those values out of
  // the legacy color parser as well.
  documentClone.documentElement.style.backgroundColor = "rgb(255, 255, 255)"
  documentClone.body.style.backgroundColor = "rgb(255, 255, 255)"
  element.setAttribute("data-invoice-pdf-export", "true")

  Array.from(element.querySelectorAll<HTMLElement>("*")).forEach((cloneElement) => {
    if (cloneElement.classList.contains("text-black/70")) {
      cloneElement.setAttribute("data-invoice-pdf-muted", "70")
    } else if (cloneElement.classList.contains("text-black/50")) {
      cloneElement.setAttribute("data-invoice-pdf-muted", "50")
    }
  })

  const style = documentClone.createElement("style")
  style.textContent = `
    [data-invoice-pdf-export] {
      color: rgb(0, 0, 0) !important;
      background-color: rgb(255, 255, 255) !important;
      border-color: rgb(229, 231, 235) !important;
      outline-color: rgb(0, 0, 0) !important;
      text-decoration-color: rgb(0, 0, 0) !important;
      -webkit-text-stroke-color: rgb(0, 0, 0) !important;
    }

    [data-invoice-pdf-export] *,
    [data-invoice-pdf-export] *::before,
    [data-invoice-pdf-export] *::after {
      color: rgb(0, 0, 0) !important;
      background-color: transparent !important;
      border-top-color: rgb(229, 231, 235) !important;
      border-right-color: rgb(229, 231, 235) !important;
      border-bottom-color: rgb(229, 231, 235) !important;
      border-left-color: rgb(229, 231, 235) !important;
      outline-color: rgb(0, 0, 0) !important;
      text-decoration-color: rgb(0, 0, 0) !important;
      -webkit-text-stroke-color: rgb(0, 0, 0) !important;
    }

    [data-invoice-pdf-muted="70"] { color: rgb(77, 77, 77) !important; }
    [data-invoice-pdf-muted="50"] { color: rgb(128, 128, 128) !important; }
  `
  documentClone.head.appendChild(style)
}

export default function InvoiceGeneratorForm() {
  const [activeTab, setActiveTab] = useState("edit")
  const invoiceRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const invoiceId = searchParams.get('id')

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    companyName: "",
    companyLogo: "",
    companyDetails: "",
    fromName: "",
    fromEmail: "",
    fromAddress: "",
    toName: searchParams.get('toName') || "",
    toEmail: searchParams.get('toEmail') || "",
    toAddress: searchParams.get('toAddress') || "",
    items: [
      {
        id: "item-1",
        description: "",
        quantity: 1,
        price: 0,
        currency: "USD",
        exchangeRate: 1,
        discountType: "percentage",
        discountValue: 0,
      },
    ],
    notes: "",
    taxRate: 0,
    currency: "USD",
    footer: "Thank you for your business!",
    discountType: "percentage",
    discountValue: 0,
    applyInvoiceDiscountToDiscountedItems: true,
    status: "Unsent"
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const guestStatus = isGuestMode()
    setIsGuest(guestStatus)
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    // Wait for guest mode to be determined before loading
    if (!isInitialized) return

    async function loadInvoice() {
      if (invoiceId) {
        setIsLoading(true)
        
        if (isGuest) {
          // Load from localStorage
          const guestInv = getGuestInvoice(invoiceId)
          if (guestInv) {
            setInvoiceData(guestInv)
          } else {
            toast.error("Invoice not found")
            router.push('/invoice-generator')
          }
        } else {
          const result = await getInvoice(invoiceId)
          
          if (result.success && result.data) {
            setInvoiceData(result.data)
          } else {
            toast.error(result.message || "Failed to load invoice")
            router.push('/invoice-generator')
          }
        }
        setIsLoading(false)
      } else {
        // Fetch company data to pre-fill fields
        setIsLoading(true)
        
        if (isGuest) {
          const guestCompany = getGuestCompany()
          if (guestCompany) {
            setInvoiceData(prev => ({
              ...prev,
              companyName: guestCompany.companyName || "",
              companyLogo: guestCompany.companyLogo || "",
              companyDetails: guestCompany.companyDetails || "",
              fromName: guestCompany.fromName || "",
              fromEmail: guestCompany.fromEmail || "",
              fromAddress: guestCompany.fromAddress || "",
            }))
          }
        } else {
          const companyResult = await getUserCompany()
          
          if (companyResult.success && companyResult.data) {
            setInvoiceData(prev => ({
              ...prev,
              companyName: companyResult.data.companyName,
              companyLogo: companyResult.data.companyLogo,
              companyDetails: companyResult.data.companyDetails,
              fromName: companyResult.data.fromName,
              fromEmail: companyResult.data.fromEmail,
              fromAddress: companyResult.data.fromAddress,
            }))
          }
        }

        // Pre-fill customer data from URL params if available
        const toName = searchParams.get('toName')
        const toEmail = searchParams.get('toEmail')
        const toAddress = searchParams.get('toAddress')
        
        if (toName || toEmail || toAddress) {
          setInvoiceData(prev => ({
            ...prev,
            toName: toName || prev.toName,
            toEmail: toEmail || prev.toEmail,
            toAddress: toAddress || prev.toAddress,
          }))
        }
        
        setIsLoading(false)
      }
    }

    loadInvoice()
  }, [invoiceId, router, isGuest, isInitialized])

  const handleInvoiceChange = (field: string, value: string | number | boolean) => {
    if (field === "currency") {
      // When invoice currency changes, update all items with the same currency to have exchange rate 1
      const updatedItems = invoiceData.items.map((item) => {
        if (item.currency === invoiceData.currency) {
          return { ...item, currency: value as string, exchangeRate: 1 }
        }
        return item
      })
      setInvoiceData({ 
        ...invoiceData, 
        [field]: value as string,
        items: updatedItems 
      })
    } else {
      setInvoiceData({ ...invoiceData, [field]: value })
    }
  }

  const handleItemChange = (id: string, field: string, value: string | number) => {
    const updatedItems = invoiceData.items.map((item) => {
      if (item.id === id) {
        if (field === "currency") {
          // If currency is changed to match invoice currency, reset exchange rate to 1
          const exchangeRate = value === invoiceData.currency ? 1 : item.exchangeRate
          return { ...item, [field]: value as string, exchangeRate }
        }

        if (field === "quantity" || field === "price" || field === "exchangeRate" || field === "discountValue") {
          return { ...item, [field]: Number(value) || 0 }
        }

        return { ...item, [field]: value }
      }
      return item
    })
    setInvoiceData({ ...invoiceData, items: updatedItems })
  }

  const addItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [
        ...invoiceData.items,
        {
          id: uuidv4(),
          description: "",
          quantity: 1,
          price: 0,
          currency: invoiceData.currency,
          exchangeRate: 1,
          discountType: "percentage",
          discountValue: 0,
        },
      ],
    })
  }

  const removeItem = (id: string) => {
    if (invoiceData.items.length > 1) {
      setInvoiceData({
        ...invoiceData,
        items: invoiceData.items.filter((item) => item.id !== id),
      })
    }
  }

  const calculateItemDiscount = (item: (typeof invoiceData.items)[0]) => {
    const itemSubtotal = item.quantity * item.price
    if (item.discountValue <= 0) return 0

    if (item.discountType === "percentage") {
      return itemSubtotal * (item.discountValue / 100)
    } else {
      return Math.min(item.discountValue, itemSubtotal) // Ensure discount doesn't exceed item subtotal
    }
  }

  const calculateItemTotal = (item: (typeof invoiceData.items)[0]) => {
    const itemSubtotal = item.quantity * item.price
    const itemDiscount = calculateItemDiscount(item)
    const itemNetTotal = itemSubtotal - itemDiscount

    return item.currency === invoiceData.currency ? itemNetTotal : itemNetTotal * item.exchangeRate
  }

  const calculateSubtotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  }

  const calculateTotalItemDiscounts = () => {
    return invoiceData.items.reduce((sum, item) => {
      const itemDiscount = calculateItemDiscount(item)
      // Convert to invoice currency if needed
      return sum + (item.currency === invoiceData.currency ? itemDiscount : itemDiscount * item.exchangeRate)
    }, 0)
  }

  const calculateDiscount = () => {
    if (invoiceData.discountValue <= 0) return 0

    let discountableAmount = 0

    if (invoiceData.applyInvoiceDiscountToDiscountedItems) {
      // Apply discount to all items
      discountableAmount = calculateSubtotal()
    } else {
      // Apply discount only to items without their own discount
      discountableAmount = invoiceData.items.reduce((sum, item) => {
        if (item.discountValue > 0) return sum // Skip items with discount

        const itemTotal = item.quantity * item.price
        return sum + (item.currency === invoiceData.currency ? itemTotal : itemTotal * item.exchangeRate)
      }, 0)
    }

    if (invoiceData.discountType === "percentage") {
      return discountableAmount * (invoiceData.discountValue / 100)
    } else {
      return Math.min(invoiceData.discountValue, discountableAmount) // Ensure discount doesn't exceed subtotal
    }
  }

  const calculateTaxableAmount = () => {
    return calculateSubtotal() - calculateDiscount()
  }

  const calculateTax = () => {
    return calculateTaxableAmount() * (invoiceData.taxRate / 100)
  }

  const calculateTotal = () => {
    return calculateTaxableAmount() + calculateTax()
  }

  const downloadPdf = async () => {
    if (invoiceRef.current) {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (documentClone, clonedElement) => {
          normalizeColorsForHtml2Canvas(documentClone, clonedElement)
        },
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      pdf.save(`invoice-${invoiceData.invoiceNumber}.pdf`)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsUploadingLogo(true)
      const reader = new FileReader()
      reader.onloadend = () => {
        setInvoiceData({
          ...invoiceData,
          companyLogo: reader.result as string,
        })
        setIsUploadingLogo(false)
        toast.success("Logo loaded. Save the invoice to upload it to storage.")
      }
      reader.onerror = () => {
        setIsUploadingLogo(false)
        toast.error("Failed to read logo file")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSaving(true)
    e.preventDefault()
    try {
      if (isGuest) {
        // Save to localStorage
        const savedInvoice = saveGuestInvoice(invoiceData)
        
        // Save company data separately
        setGuestCompany({
          companyName: invoiceData.companyName,
          companyLogo: invoiceData.companyLogo,
          companyDetails: invoiceData.companyDetails,
          fromName: invoiceData.fromName,
          fromEmail: invoiceData.fromEmail,
          fromAddress: invoiceData.fromAddress,
        })
        
        toast.success(invoiceId ? "Your invoice was updated successfully." : "Your invoice was saved successfully.", {
          description: invoiceId ? "Invoice Updated" : "Invoice Saved",
        })
        
        if (!invoiceId) {
          router.push(`/invoice-generator?id=${savedInvoice.id}`)
        }
      } else {
        const result = await saveInvoice(invoiceData)
        if (result && result.success === false) {
          toast.error(result.message || "There was an error saving your invoice.")
        } else {
          toast.success(invoiceId ? "Your invoice was updated successfully." : "Your invoice was saved successfully.")
          if (!invoiceId && result.data) {
            router.push(`/invoice-generator?id=${result.data.id}`)
          }
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "There was an error saving your invoice.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="edit">Edit Invoice</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <InvoiceForm
            invoiceData={invoiceData}
            handleInvoiceChange={handleInvoiceChange}
            handleItemChange={handleItemChange}
            handleLogoUpload={handleLogoUpload}
            addItem={addItem}
            removeItem={removeItem}
            calculateItemDiscount={calculateItemDiscount}
            calculateItemTotal={calculateItemTotal}
            calculateTotalItemDiscounts={calculateTotalItemDiscounts}
            calculateSubtotal={calculateSubtotal}
            calculateDiscount={calculateDiscount}
            calculateTaxableAmount={calculateTaxableAmount}
            calculateTax={calculateTax}
            calculateTotal={calculateTotal}
            handleSubmit={handleSaveInvoice}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="preview">
          <Card className="p-6">
            <div ref={invoiceRef}>
              <InvoicePreview
                invoiceData={invoiceData}
                calculateItemDiscount={calculateItemDiscount}
                calculateItemTotal={calculateItemTotal}
                calculateTotalItemDiscounts={calculateTotalItemDiscounts}
                calculateSubtotal={calculateSubtotal}
                calculateDiscount={calculateDiscount}
                calculateTaxableAmount={calculateTaxableAmount}
                calculateTax={calculateTax}
                calculateTotal={calculateTotal}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={downloadPdf}>Download PDF</Button>              
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
