import { redirect } from "next/navigation";

// La portada no aporta: el trabajo empieza siempre en el planteamiento.
export default function Home() {
  redirect("/planteamiento");
}
