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

export async function getCustomers() {
  // Check if user is in guest mode
  const cookieStore = await cookies()
  const isGuest = cookieStore.get('guest_mode')?.value === 'true'
  
  if (isGuest) {
    // Return empty array - client will extract from invoices
    return { success: true, data: [], isGuest: true }
  }
  
  const supabase = await createClient()

  const { data: customers, error } = await supabase
    .from('customers')
    // Alias the deployed schema's legacy names to the UI's customer shape.
    .select('id, to_name:contact_name, to_email:email, to_address:address')
    .order('contact_name', { ascending: true })

  if (error) {
    console.error('Error fetching customers:', error)
    return { success: false, message: error.message, data: [] }
  }

  const camelCaseCustomers = toCamelCase(customers)

  return { success: true, data: camelCaseCustomers }
}
