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

export async function getUserCompany() {
  // Check if user is in guest mode
  const cookieStore = await cookies()
  const isGuest = cookieStore.get('guest_mode')?.value === 'true'
  
  if (isGuest) {
    // Return empty company data - client will handle guest storage
    return {
      success: true,
      data: {
        companyName: "",
        companyLogo: "",
        companyDetails: "",
        fromName: "",
        fromEmail: "",
        fromAddress: "",
      },
      isGuest: true
    }
  }
  
  const supabase = await createClient()

  const { data: customers, error } = await supabase
    .from('customers')
    .select(`
      company_name,
      logo_url,
      company_details,
      id
    `)
    .limit(1)

  if (error) {
    return { success: false, message: error.message }
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('from_name, from_email, from_address')
    .order('date', { ascending: false })
    .limit(1)

  const company = customers?.[0] ? toCamelCase(customers[0]) : {}
  const invoice = invoices?.[0] ? toCamelCase(invoices[0]) : {}

  return {
    success: true,
    data: {
      companyName: company.companyName || "",
      companyLogo: company.logoUrl || "",
      companyDetails: company.companyDetails || "",
      fromName: invoice.fromName || "",
      fromEmail: invoice.fromEmail || "",
      fromAddress: invoice.fromAddress || "",
    }
  }
}
