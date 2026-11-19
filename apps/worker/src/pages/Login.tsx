import { PortalLogin } from "@obragoito/ui";

export function Login() {
  return (
    <PortalLogin
      brandSub="Equipa"
      title="Entrar na equipa"
      subtitle="Registe o trabalho realizado, envie relatórios e fale com a administração."
      asideImage="/media/projects/monumento-covid.jpg"
      asideAlt="Calçada de homenagem aos profissionais Covid, obra de urbanismo da Obragoito"
      asideTitle="O trabalho do dia, registado em minutos."
      asideText="Relatórios, mensagens e fotografias direto do estaleiro — com escrita manual ou por voz."
      footer={<p>O acesso é criado pela administração da Obragoito.</p>}
    />
  );
}
