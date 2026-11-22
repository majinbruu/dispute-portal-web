import { Link } from 'react-router';
import { PageHeader } from '../../components/PageHeader';
import styles from './Mandates.module.css';
import { MANDATE_TYPE_VIEWS } from './presentation';

const CHOICES = [MANDATE_TYPE_VIEWS.DebiCheck, MANDATE_TYPE_VIEWS.Registered];

/** Entry point for mandates: the customer chooses which kind to look at. */
export function MandatesHomePage() {
  return (
    <>
      <PageHeader
        title="Debit order mandates"
        description="A mandate is your permission for a company to collect debit orders from your account."
      />
      <ul className={styles.choices} aria-label="Mandate types">
        {CHOICES.map((choice) => (
          <li key={choice.type}>
            <Link to={`/mandates/${choice.slug}`} className={styles.choice}>
              <span className={styles.choiceTitle}>{choice.title}</span>
              <span className={styles.choiceDescription}>{choice.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
