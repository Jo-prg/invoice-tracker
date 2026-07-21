import { CustomerDetail } from "@/components/customers/customer-detail"

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex flex-col h-screen">
      <CustomerDetail customerId={id} />
    </div>
  )
}
