"use server"

import { createClient } from "@/lib/supabase/server"
import type { InvoiceData } from "@/types/invoice"
import { cookies } from "next/headers"

export async function getInvoice(invoiceId: string) {
  // Check if user is in guest mode
  const cookieStore = await cookies()
  const isGuest = cookieStore.get('guest_mode')?.value === 'true'
  
  if (isGuest) {
    // Return null - client will handle guest data
    return { success: true, data: null, isGuest: true }
  }
  
  const supabase = await createClient()

  // Fetch invoice, customers, and line items only
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      date,
      due_date,
      from_name,
      from_email,
      from_address,
      notes,
      tax_rate,
      currency,
      footer,
      discount_type,
      discount_value,
      apply_invoice_discount_to_discounted_items,
      status,
      customer_id,
      customers (
        id,
        company_name,
        logo_url,
        company_details,
        to_name:contact_name,
        to_email:email,
        to_address:address
      ),
      invoice_line_items (
        id,
        description,
        quantity,
        price,
        currency,
        exchange_rate,
        discount_type,
        discount_value
      )
    `)
    .eq('id', invoiceId)
    .single()

  if (error) {
    return { success: false, message: error.message }
  }

  if (!invoice) {
    return { success: false, message: "Invoice not found" }
  }

  const customers = Array.isArray(invoice.customers) ? invoice.customers[0] : invoice.customers;

  const invoiceData: InvoiceData = {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    date: invoice.date,
    dueDate: invoice.due_date,
    companyName: customers?.company_name || "",
    companyLogo: customers?.logo_url || "",
    companyDetails: customers?.company_details || "",
    fromName: invoice.from_name || "",
    fromEmail: invoice.from_email || "",
    fromAddress: invoice.from_address || "",
    toName: customers?.to_name || "",
    toEmail: customers?.to_email || "",
    toAddress: customers?.to_address || "",
    items: invoice.invoice_line_items?.map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      currency: item.currency,
      exchangeRate: item.exchange_rate,
      discountType: item.discount_type,
      discountValue: item.discount_value,
    })) || [],
    notes: invoice.notes || "",
    taxRate: invoice.tax_rate,
    currency: invoice.currency,
    footer: invoice.footer || "",
    discountType: invoice.discount_type,
    discountValue: invoice.discount_value,
    applyInvoiceDiscountToDiscountedItems: invoice.apply_invoice_discount_to_discounted_items,
    status: invoice.status,
    customerId: invoice.customer_id,
  }

  return { success: true, data: invoiceData }
}
