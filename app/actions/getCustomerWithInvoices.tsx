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

export async function getCustomerWithInvoices(customerId: string) {
  // Check if user is in guest mode
  const cookieStore = await cookies()
  const isGuest = cookieStore.get('guest_mode')?.value === 'true'
  
  if (isGuest) {
    // Return null - client will handle guest data
    return { success: true, data: null, isGuest: true }
  }
  
  const supabase = await createClient()

  // Fetch customer details
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    // Alias the deployed schema's legacy names to the UI's customer shape.
    .select('id, to_name:contact_name, to_email:email, to_address:address')
    .eq('id', customerId)
    .single()

  if (customerError) {
    console.error('Error fetching customer:', customerError)
    return { success: false, message: customerError.message, data: null }
  }

  // Fetch invoices for this customer
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_line_items (*)
    `)
    .eq('customer_id', customerId)
    .order('date', { ascending: false })

  if (invoicesError) {
    console.error('Error fetching invoices:', invoicesError)
    return { 
      success: true, 
      data: { customer: toCamelCase(customer), invoices: [] } 
    }
  }

  return { 
    success: true, 
    data: { 
      customer: toCamelCase(customer), 
      invoices: toCamelCase(invoices) 
    } 
  }
}
