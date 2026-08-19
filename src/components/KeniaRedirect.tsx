import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";

export function KeniaRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Defer navigation one tick so Helmet can write the noindex/canonical tags
    // before the browser replaces the URL with the root route.
    const id = setTimeout(() => navigate("/", { replace: true }), 0);
    return () => clearTimeout(id);
  }, [navigate]);

  return (
    <Helmet>
      <title>Save Car Brasil</title>
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href="https://savecarcotacao.com/" />
    </Helmet>
  );
}
