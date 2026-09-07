import { FichaPedido } from "@/components/revision/FichaPedido";

export default async function FichaPedidoPage({
  params,
}: PageProps<"/revision/[pedido]">) {
  const { pedido } = await params;
  return <FichaPedido pedido={decodeURIComponent(pedido)} />;
}
