import { Users } from "./Users";

export function Trabalhadores() {
  return (
    <Users
      fixedRole="worker"
      title="Trabalhadores"
      subtitle="Equipa de obra. Importe a lista em CSV ou Excel para criar as contas com palavra-passe temporária."
    />
  );
}
