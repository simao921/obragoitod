import { PortalLogin } from "@obragoito/ui";

export function Login() {
  return (
    <PortalLogin
      brandSub="Gestão"
      title="Entrar na gestão"
      subtitle="Área reservada à administração da Obragoito. O acesso é criado por um administrador."
      asideImage="/media/projects/monumento-agricultura.jpg"
      asideAlt="Monumento de homenagem à agricultura, obra de urbanismo da Obragoito"
      asideTitle="A obra inteira, num só lugar."
      asideText="Obras, equipas, clientes e documentos — com registo de tudo o que acontece."
      footer={
        <p>
          Sem registo público. Se precisa de acesso, contacte a administração em{" "}
          <a href="mailto:obragoito@obragoito.pt">obragoito@obragoito.pt</a>.
        </p>
      }
    />
  );
}
