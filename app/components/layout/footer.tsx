import { Apple } from "lucide-react";
import {
  FaDiscord,
  FaFacebookF,
  FaInstagram,
  FaRedditAlien,
  FaXTwitter,
} from "react-icons/fa6";

const linkGroups = [
  {
    title: "Apie Eneba",
    links: [
      "Apie ENEBA",
      "Susisiek su mumis",
      "Darbo pasiūlymai",
      "Eneba Pasitikėjimas ir Skaidrumas",
      "Engineering",
    ],
  },
  {
    title: "Pirkimas",
    links: ["Kaip pirkti", "Kolekcijos", "Lojalumo programa", "Nuolaidos"],
  },
  {
    title: "Pagalba",
    links: [
      "D.U.K.",
      "Kaip aktyvuoti žaidimą",
      "Pildyti užklausą",
      "Grąžinimo politika",
      "Turinio ataskaitos",
    ],
  },
  {
    title: "Bendruomenė",
    links: [
      "Žaidimų naujienos",
      "Konkursai",
      "Tapk partneriu",
      "Snakzy: Žaisk ir uždirbk",
    ],
  },
  {
    title: "Verslui",
    links: ["Parduok per Eneba", "Reklamuok pas mus"],
  },
] as const;

export function Footer() {
  return (
    <footer className="site-footer" id="site-footer">
      <div className="site-footer__grid">
        {linkGroups.map((group) => (
          <section className="site-footer__column" key={group.title}>
            <h2>{group.title}</h2>
            <ul>
              {group.links.map((link) => (
                <li key={link}>
                  <a href="#site-footer">{link}</a>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="site-footer__column site-footer__social">
          <h2>Sek mus</h2>
          <div className="site-footer__social-links">
            <a aria-label="Facebook" href="#site-footer">
              <FaFacebookF aria-hidden="true" />
            </a>
            <a aria-label="X" href="#site-footer">
              <FaXTwitter aria-hidden="true" />
            </a>
            <a aria-label="Instagram" href="#site-footer">
              <FaInstagram aria-hidden="true" />
            </a>
            <a aria-label="Discord" href="#site-footer">
              <FaDiscord aria-hidden="true" />
            </a>
            <a aria-label="Reddit" href="#site-footer">
              <FaRedditAlien aria-hidden="true" />
            </a>
          </div>
        </section>
        <section className="site-footer__column site-footer__apps">
          <h2>Atsisiųsti Eneba programėlę</h2>
          <a className="site-footer__store-badge" href="#site-footer">
            <span aria-hidden="true" className="site-footer__google-play-mark" />
            <span>
              <small>GET IT ON</small>
              <strong>Google Play</strong>
            </span>
          </a>
          <a className="site-footer__store-badge" href="#site-footer">
            <Apple aria-hidden="true" />
            <span>
              <small>Download on the</small>
              <strong>App Store</strong>
            </span>
          </a>
        </section>
      </div>
    </footer>
  );
}
