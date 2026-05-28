import logo from "@/assets/logo-savecar.png";
import { Link } from "react-router-dom";

interface HeaderProps {
  dark?: boolean;
}

const Header = ({ dark = false }: HeaderProps) => {
  return (
    <header className="w-full h-16 px-4 flex items-center justify-center bg-white overflow-visible relative z-20">
      <Link to="/" aria-label="Voltar para a página inicial" className="block">
        <img
          src={logo}
          alt="SAVE CAR BRASIL"
          className="h-28 object-contain transition-transform hover:scale-105"
        />
      </Link>
    </header>
  );
};

export default Header;
