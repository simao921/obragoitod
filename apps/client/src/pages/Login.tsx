import { PortalLogin } from "@obragoito/ui";

export function Login() {
  return (
    <PortalLogin
      brandSub="Área de cliente"
      title="Entrar na sua obra"
      subtitle="Acompanhe o progresso, consulte fotografias e documentos e fale com a equipa."
      asideImage="/media/projects/freeport.jpg"
      asideAlt="Parque infantil do Freeport, obra de infraestruturas da Obragoito"
      asideTitle="A sua obra, com toda a transparência."
      asideText="Atualizações publicadas pela equipa, fotografias do local e documentos num só lugar."
      footer={<p>O acesso é criado pela Obragoito. Se ainda não tem conta, contacte-nos.</p>}
    />
  );
}
