import { useParams } from 'react-router';
import { useMandate } from '../../api/queries';
import type { Mandate } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { DescriptionList } from '../../components/DescriptionList';
import { ErrorState } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatDate, formatDateTime, formatMoney, formatOrdinal } from '../../lib/format';
import { toProblem } from '../../lib/problem';
import styles from './Mandates.module.css';
import { MANDATE_STATUS_TONE, MANDATE_TYPE_VIEWS, mandateListPath } from './presentation';

const FALLBACK_BACK = { to: '/mandates', label: 'Debit order mandates' };

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

/** The API gives a day number; only for monthly mandates is it certain to be a day of the month. */
function collectionDay(mandate: Mandate): string {
  return mandate.frequency === 'Monthly'
    ? `${formatOrdinal(mandate.collectionDay)} of each month`
    : `Day ${mandate.collectionDay}`;
}

function Details({ mandate }: { mandate: Mandate }) {
  const isDebiCheck = mandate.type === 'DebiCheck';
  return (
    <div className={styles.stack}>
      <Card>
        <div className={styles.summary}>
          <div>
            <p className={styles.amountLabel}>Instalment amount</p>
            <p className={styles.amount}>
              {formatMoney(mandate.instalmentAmount, mandate.currency)}
            </p>
          </div>
          <div className={styles.badges}>
            <Badge tone={MANDATE_STATUS_TONE[mandate.status]}>{mandate.status}</Badge>
            <Badge>{mandate.type}</Badge>
          </div>
        </div>
        <DescriptionList
          items={[
            { label: 'Company', value: mandate.creditorName },
            { label: 'Shown on your statement as', value: mandate.creditorShortName },
            { label: 'Mandate reference', value: mandate.mandateReference },
            { label: 'Contract reference', value: mandate.contractReference },
          ]}
        />
      </Card>
      <Card title="Collection">
        <DescriptionList
          items={[
            {
              label: 'Instalment amount',
              value: formatMoney(mandate.instalmentAmount, mandate.currency),
            },
            {
              label: 'Maximum collection amount',
              value: formatMoney(mandate.maximumCollectionAmount, mandate.currency),
            },
            { label: 'Frequency', value: mandate.frequency },
            { label: 'Collection day', value: collectionDay(mandate) },
            { label: 'First collection date', value: formatDate(mandate.firstCollectionDate) },
            { label: 'Date adjustment allowed', value: yesNo(mandate.dateAdjustmentAllowed) },
            { label: 'Tracking enabled', value: yesNo(mandate.trackingEnabled) },
          ]}
        />
      </Card>
      {isDebiCheck ? (
        <Card title="Authentication">
          <DescriptionList
            items={[
              {
                label: 'Authentication type',
                value: mandate.authenticationType ?? 'Not recorded',
              },
              {
                label: 'Authenticated on',
                value: mandate.authenticatedAt
                  ? formatDateTime(mandate.authenticatedAt)
                  : 'Not recorded',
              },
            ]}
          />
        </Card>
      ) : null}
    </div>
  );
}

export function MandateDetailPage() {
  const { id = '' } = useParams();
  const query = useMandate(id);

  if (query.isPending) {
    return (
      <>
        <PageHeader title="Mandate" back={FALLBACK_BACK} />
        <Spinner label="Loading mandate…" />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title="Mandate" back={FALLBACK_BACK} />
        <ErrorState
          problem={toProblem(query.error)}
          title="We could not load this mandate"
          onRetry={() => void query.refetch()}
        />
      </>
    );
  }

  const mandate = query.data;
  const view = MANDATE_TYPE_VIEWS[mandate.type];
  return (
    <>
      <PageHeader
        title={mandate.creditorName}
        description={`${mandate.type} mandate`}
        back={{ to: mandateListPath(mandate.type), label: view.title }}
      />
      <Details mandate={mandate} />
    </>
  );
}
