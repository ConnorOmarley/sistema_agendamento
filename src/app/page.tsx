import { redirect } from "next/navigation";

export default function Home() {
  // O proxy.ts redireciona /login para /dashboard caso já exista sessão,
  // então este redirect duplo cobre os dois cenários: logado vai pro dashboard,
  // anônimo vê o login.
  redirect("/login");
}