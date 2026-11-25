import './FeaturedGuides.css';

const GUIDES = [
  {
    href: '/guider/planlegg-barnebursdag-steg-for-steg',
    title: 'Planlegg barnebursdagen steg for steg',
    description: 'En rekkefølge for invitasjon, innkjøp, forberedelser og selve dagen.'
  },
  {
    href: '/guider/hvor-mye-mat-til-barnebursdag',
    title: 'Hvor mye mat trenger du?',
    description: 'Se mengdene bak handlelisten og regneeksempler for 8, 10 og 12 barn.'
  },
  {
    href: '/guider/slik-beregner-kakeklar',
    title: 'Slik regner Kakeklar',
    description: 'Se hvordan alder, voksne, menyvalg og pakningsstørrelser påvirker resultatet.'
  }
];

export default function FeaturedGuides() {
  return (
    <section className="home-guides" data-testid="featured-guides" aria-labelledby="home-guides-title">
      <h2 id="home-guides-title">Tre guider som gjør planleggingen enklere</h2>
      <p className="home-guides-lead">
        Mengdene i kalkulatoren er redigerbare planleggingsforslag, ikke offisielle porsjons- eller ernæringsråd.
        Start med guiden som svarer på spørsmålet ditt.
      </p>
      <div className="home-guides-list">
        {GUIDES.map((guide) => (
          <a className="home-guide" href={guide.href} key={guide.href}>
            <strong>{guide.title}</strong>
            <span>{guide.description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
