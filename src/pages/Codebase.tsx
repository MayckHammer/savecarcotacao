import { useEffect, useState } from "react";

const Codebase = () => {
  const [content, setContent] = useState("Carregando...");

  useEffect(() => {
    fetch("/CODEBASE_COMPLETO.md")
      .then((res) => res.text())
      .then(setContent)
      .catch(() => setContent("Erro ao carregar o documento."));
  }, []);

  return (
    <div className="min-h-screen bg-white p-4">
      <pre className="whitespace-pre-wrap text-xs font-mono text-gray-900 max-w-5xl mx-auto">
        {content}
      </pre>
    </div>
  );
};

export default Codebase;
