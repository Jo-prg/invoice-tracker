"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// Utility to convert snake_case keys to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase)
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        toCamelCase(value),
      ])
    )
  }
  return obj
}

export async function getInvoices() {
  // Check if user is in guest mode
  const cookieStore = await cookies()
  const isGuest = cookieStore.get('guest_mode')?.value === 'true'
  
  if (isGuest) {
    // Return empty array - client will handle guest data
    return { success: true, data: [], isGuest: true }
  }
  
  const supabase = await createClient()

  // Fetch invoices with customers and line items only
  const { data: invoices, error } = await supabase
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
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching invoices:', error)
    return { success: false, message: error.message, data: [] }
  }

  // Convert snake_case to camelCase
  const camelCaseInvoices = toCamelCase(invoices)

  const combinedInvoices = camelCaseInvoices.map((invoice: any) => ({
    ...invoice,
    companyName: invoice.customers?.companyName || "",
    companyLogo: invoice.customers?.logoUrl || "",
    companyDetails: invoice.customers?.companyDetails || "",
    fromName: invoice.fromName || "",
    fromEmail: invoice.fromEmail || "",
    fromAddress: invoice.fromAddress || "",
  }))

  return { success: true, data: combinedInvoices }
}
