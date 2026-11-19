import { Users } from "./Users";

export function Clientes() {
  return (
    <Users
      fixedRole="client"
      title="Clientes"
      subtitle="Contas de cliente com acesso ao portal. Cada cliente vê apenas as obras que lhe forem atribuídas."
    />
  );
}
