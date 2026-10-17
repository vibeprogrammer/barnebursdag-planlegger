export default function Footer() {
  return (
    <footer className="foot">
      <p>Kakeklar er gratis · ingen innlogging · for norske foreldre. Mengdene er anbefalinger – juster fritt.</p>
      <nav className="foot-nav" aria-label="Informasjon">
        <a href="/om-kakeklar">Om Kakeklar</a>
        <a href="/om-forfatteren">Om forfatteren</a>
        <a href="/guider">Guider</a>
        <a href="/oppskrifter">Oppskrifter</a>
        <a href="/personvern">Personvern</a>
        <a href="/vilkar">Vilkår</a>
        <a href="/kontakt">Kontakt</a>
      </nav>
      <p className="foot-credit">
        Made in Norway by{' '}
        <a href="/om-forfatteren">Maxim Salnikov</a>
        {' · '}
        <a href="https://github.com/webmaxru/barnebursdag-planlegger" target="_blank" rel="noopener noreferrer">GitHub</a>
      </p>
    </footer>
  );
}
