import logo from "@/assets/logo-savecar.png";

interface HeaderProps {
  dark?: boolean;
}

const Header = ({ dark = false }: HeaderProps) => {
  return (
    <header className={`w-full py-4 px-4 flex items-center justify-center ${dark ? "bg-primary" : "bg-card"}`}>
      <img src={logo} alt="SAVE CAR BRASIL" className="h-20 object-contain" />
    </header>
  );
};

export default Header;
