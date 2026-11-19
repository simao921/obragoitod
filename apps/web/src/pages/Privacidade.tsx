import { Link } from "react-router-dom";
import { COMPANY } from "@obragoito/core";
import { Seo } from "../components/Seo";

export function Privacidade() {
  return (
    <>
      <Seo
        title="Política de privacidade — Obragoito"
        description="Como a Obragoito recolhe, utiliza e conserva os dados enviados através do formulário de pedido de orçamento."
        noIndex={false}
      />

      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">Privacidade</p>
          <h1 className="page-hero__title">Política de privacidade.</h1>
          <p className="page-hero__lede">
            Esta página descreve os dados recolhidos através do formulário de pedido de orçamento e do contacto
            com a Obragoito.
          </p>
        </div>
      </header>

      <section className="section section--tight">
        <div className="container container--narrow" style={{ display: "grid", gap: "var(--space-6)" }}>
          <div>
            <h2 style={{ fontSize: "var(--text-xl)" }}>Responsável pelo tratamento</h2>
            <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
              {COMPANY.legalName}, com sede em {COMPANY.address.street}, {COMPANY.address.postalCode}{" "}
              {COMPANY.address.city}. Contacto: <a className="link-underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--text-xl)" }}>Dados recolhidos</h2>
            <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
              No formulário de pedido de orçamento recolhemos apenas: nome, email, telefone (opcional), área do
              projeto e a descrição do pedido. Registamos também a data do consentimento. Não recolhemos
              categorias especiais de dados nem dados de menores.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--text-xl)" }}>Finalidade e fundamento</h2>
            <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
              Os dados são utilizados exclusivamente para responder ao pedido de orçamento e preparar uma
              proposta. O fundamento é o consentimento prestado no formulário e, quando aplicável, a execução
              de diligências pré-contratuais.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--text-xl)" }}>Conservação</h2>
            <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
              Os pedidos são conservados enquanto forem necessários para responder ao pedido e cumprir
              obrigações legais aplicáveis. Pedidos sem seguimento são eliminados pela nossa equipa.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--text-xl)" }}>Partilha e subcontratantes</h2>
            <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
              Os dados podem ser tratados por prestadores de serviços técnicos que suportam o alojamento do
              site, a base de dados e o envio de email, no âmbito de contratos de subcontratação. Não são
              vendidos nem cedidos para fins de marketing.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--text-xl)" }}>Segurança</h2>
            <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
              O acesso aos dados é restrito e feito através de contas individuais criadas pela empresa. As
              palavras-passe são guardadas apenas em forma de hash e nunca em texto simples.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--text-xl)" }}>Direitos</h2>
            <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
              Pode solicitar o acesso, a retificação, o apagamento, a limitação ou a portabilidade dos seus
              dados, bem como retirar o consentimento, através de {COMPANY.email}. Tem também o direito de
              apresentar reclamação à Comissão Nacional de Proteção de Dados.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "var(--text-xl)" }}>Nota</h2>
            <p className="text-muted" style={{ marginTop: "var(--space-3)" }}>
              Este texto descreve o funcionamento atual do site e deve ser revisto juridicamente antes da
              publicação, incluindo a identificação de eventuais encarregados de proteção de dados e prazos de
              conservação específicos.
            </p>
          </div>

          <div>
            <Link to="/contactos" className="btn btn--sm">
              <span>Contactar</span>
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
