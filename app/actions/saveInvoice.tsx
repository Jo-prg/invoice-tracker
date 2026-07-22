"use server"

import { createClient } from "@/lib/supabase/server"
import type { InvoiceData, Customers } from "@/types/invoice"
import { uploadLogo, deleteLogo } from "./uploadLogo"
import { cookies } from "next/headers"

// Utility to convert camelCase keys to snake_case
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase)
  } else if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/([A-Z])/g, "_$1").toLowerCase(),
        toSnakeCase(value),
      ])
    )
  }
  return obj
}

function getCustomerData(invoice: InvoiceData): Customers {
  return {
    // The deployed customers table uses the original customer column names.
    // Keep the legacy company fields populated because company_name is NOT NULL.
    companyName: invoice.companyName || "",
    logoUrl: invoice.companyLogo || "",
    companyDetails: invoice.companyDetails || "",
    contactName: invoice.toName || "",
    email: invoice.toEmail || "",
    address: invoice.toAddress || "",
  }
}

function getInvoiceData(invoice: InvoiceData) {
  const {
    applyInvoiceDiscountToDiscountedItems,
    currency,
    date,
    discountType,
    discountValue,
    dueDate,
    footer,
    fromAddress,
    fromEmail,
    fromName,
    invoiceNumber,
    notes,
    status,
    taxRate
    // removed company and from fields
  } = invoice

  return {
    applyInvoiceDiscountToDiscountedItems,
    currency,
    date,
    discountType,
    discountValue,
    dueDate,
    footer,
    fromAddress,
    fromEmail,
    fromName,
    invoiceNumber,
    notes,
    status,
    taxRate
  }
}

// Save the invoice to the supabase database
export async function saveInvoice(invoice: InvoiceData) {
  try {
    return await saveInvoiceInternal(invoice)
  } catch (error: unknown) {
    console.error('Unexpected error saving invoice:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unexpected error saving invoice',
    }
  }
}

async function saveInvoiceInternal(invoice: InvoiceData) {
  if (!invoice || !Array.isArray(invoice.items)) {
    return { success: false, message: 'Invoice items are missing or invalid' }
  }

  // Check if user is in guest mode
  const cookieStore = await cookies()
  const isGuest = cookieStore.get('guest_mode')?.value === 'true'
  
  if (isGuest) {
    // For guest mode, return success - actual storage happens client-side
    return { 
      success: true, 
      data: { 
        ...invoice, 
        id: invoice.id || `guest_inv_${Date.now()}` 
      },
      isGuest: true 
    }
  }
  
  const supabase = await createClient()
  let customerData = toSnakeCase(getCustomerData(invoice));
  const invoiceData = toSnakeCase(getInvoiceData(invoice));  
  
  // Remove 'id' from each item before saving
  const lineItems = toSnakeCase(invoice["items"]).map((item: any) => {
    const { id, ...rest } = item
    return rest
  });

  let customer;
  let customerId;

  // Check if a customer with this email already exists for the current user
  const { data: existingCustomer, error: customerFetchError } = await supabase
    .from('customers')
    .select()
    .eq('email', customerData.email)
    .maybeSingle();

  if (customerFetchError) {
    return { success: false, message: customerFetchError.message }
  }

  // Handle logo upload if it's a base64 string (new upload).
  if (customerData.logo_url && customerData.logo_url.startsWith('data:image')) {
    const uploadResult = await uploadLogo(customerData.logo_url)

    if (!uploadResult.success) {
      return { success: false, message: `Logo upload failed: ${uploadResult.message}` }
    }

    if (existingCustomer?.logo_url && !existingCustomer.logo_url.startsWith('data:image')) {
      await deleteLogo(existingCustomer.logo_url)
    }

    customerData = { ...customerData, logo_url: uploadResult.url }
  }

  if (existingCustomer) {
    // Update existing customer
    const { data: updatedCustomer, error: customerError } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', existingCustomer.id)
      .select()
      .single();

    if (customerError) {
      return { success: false, message: customerError.message }
    }
    customer = updatedCustomer;
    customerId = updatedCustomer.id;
  } else {
    // Insert new customer
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (customerError) {
      return { success: false, message: customerError.message }
    }
    customer = newCustomer;
    customerId = newCustomer.id;
  }

  // Attach customer_id to invoiceData
  invoiceData.customer_id = customerId;

  let invoiceResult;

  if (invoice.id) {
    // Update existing invoice
    const { data, error: invoiceError } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('id', invoice.id)
      .select()
      .single();

    if (invoiceError) {
      const message = invoiceError.code === '23505' 
        ? 'An invoice with this number already exists for this customer'
        : invoiceError.message;
      return { success: false, message }
    }
    invoiceResult = data;
  } else {
    // Insert new invoice
    const { data, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) {
      const message = invoiceError.code === '23505' 
        ? 'An invoice with this number already exists for this customer'
        : invoiceError.message;
      return { success: false, message }
    }
    invoiceResult = data;
  }

  // Delete existing line items for this invoice
  await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', invoiceResult.id);

  // Insert line items with invoice_id
  const lineItemsWithInvoiceId = lineItems.map((item: any) => ({
    ...item,
    invoice_id: invoiceResult.id,
  }));

  if (lineItemsWithInvoiceId.length > 0) {
    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsWithInvoiceId);

    if (lineItemsError) {
      return { success: false, message: lineItemsError.message }
    }
  }

  return { success: true, data: invoiceResult }
}
