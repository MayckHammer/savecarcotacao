import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";

export function KeniaRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Give Helmet a moment to write the noindex/canonical tags before
    // replacing the URL with the root route. The delay is short enough
    // that users won't notice it on a legacy redirect.
    const id = setTimeout(() => navigate("/", { replace: true }), 250);
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
