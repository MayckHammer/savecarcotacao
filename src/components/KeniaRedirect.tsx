import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";

export function KeniaRedirect() {
  return (
    <>
      <Helmet>
        <title>Save Car Brasil</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://savecarcotacao.com/" />
      </Helmet>
      <Navigate to="/" replace />
    </>
  );
}
