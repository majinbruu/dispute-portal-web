import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { useTransaction } from '../../api/queries';
import type { CardDetail, DebitOrderDetail, Transaction } from '../../api/types';
import { Badge } from '../../components/Badge';
import { ButtonLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { type DescriptionItem, DescriptionList } from '../../components/DescriptionList';
import { ErrorState } from '../../components/ErrorState';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { formatCountry, formatDate, formatMoney, humanizeEnum, toNumber } from '../../lib/format';
import {
  cardEntryModeLabel,
  cardVerificationLabel,
  disputeStatusLabel,
  mandateTypeLabel,
  transactionTypeLabel,
} from '../../lib/labels';
import { toProblem } from '../../lib/problem';
import {
  CARD_STATUS_TONE,
  cardName,
  DEBIT_ORDER_STATUS_TONE,
  transactionListPath,
} from './presentation';
import styles from './Transactions.module.css';

const TITLE = 'Transaction';
const BACK_LABEL = 'My transactions';

/** What one type of transaction puts in the summary card: its chips and its facts. */
interface TypeDetails {
  badges: ReactNode;
  items: DescriptionItem[];
}

function debitOrderDetails(transaction: Transaction, debitOrder: DebitOrderDetail): TypeDetails {
  return {
    badges: (
      <>
        <Badge>{mandateTypeLabel(debitOrder.mandateType)}</Badge>
        <Badge tone={DEBIT_ORDER_STATUS_TONE[debitOrder.status]}>{debitOrder.status}</Badge>
      </>
    ),
    items: [
      { label: 'Statement text', value: debitOrder.statementText },
      { label: 'Date', value: formatDate(transaction.effectiveDate) },
      { label: 'Status', value: debitOrder.status },
      { label: 'Reason', value: debitOrder.statusReason },
      { label: 'Transaction ID', value: debitOrder.transactionId },
      { label: 'Contract reference', value: debitOrder.contractReference },
      { label: 'Account', value: transaction.accountMasked },
      { label: 'Collection', value: humanizeEnum(debitOrder.sequenceType) },
    ],
  };
}

function cardDetails(transaction: Transaction, card: CardDetail): TypeDetails {
  const refunded = toNumber(card.refundedAmount);
  return {
    badges: (
      <>
        <Badge>{humanizeEnum(card.kind)}</Badge>
        <Badge tone={CARD_STATUS_TONE[card.status]}>{card.status}</Badge>
      </>
    ),
    items: [
      { label: 'Merchant', value: transaction.counterpartyName },
      {
        label: 'Merchant location',
        value: `${card.merchantCity}, ${formatCountry(card.merchantCountry)}`,
      },
      { label: 'Card', value: cardName(card) },
      { label: 'Transaction date', value: formatDate(card.transactionDate) },
      // A transaction that has not settled has no posting date yet.
      { label: 'Posting date', value: card.postingDate ? formatDate(card.postingDate) : null },
      { label: 'Status', value: card.status },
      {
        label: 'Refunded',
        value: refunded > 0 ? formatMoney(refunded, transaction.currency) : null,
      },
      { label: 'How the card was used', value: cardEntryModeLabel(card.entryMode) },
      { label: 'Verification', value: cardVerificationLabel(card.verification) },
      { label: 'Account', value: transaction.accountMasked },
      { label: 'Authorisation code', value: card.authorisationCode },
      { label: 'Acquirer reference number', value: card.acquirerReferenceNumber },
      { label: 'Merchant category code', value: card.merchantCategoryCode },
    ],
  };
}

function typeDetails(transaction: Transaction): TypeDetails {
  if (transaction.debitOrder) return debitOrderDetails(transaction, transaction.debitOrder);
  if (transaction.card) return cardDetails(transaction, transaction.card);
  return { badges: null, items: [{ label: 'Date', value: formatDate(transaction.effectiveDate) }] };
}

/** Only DebiCheck and Registered Mandate debit orders have a mandate to show; EFT has none. */
function MandateCard({ debitOrder }: { debitOrder: DebitOrderDetail }) {
  if (!debitOrder.mandateId || !debitOrder.mandateReference) return null;
  return (
    <Card title="Mandate">
      <DescriptionList
        items={[
          { label: 'Mandate type', value: mandateTypeLabel(debitOrder.mandateType) },
          {
            label: 'Mandate reference',
            value: (
              <Link to={`/mandates/${debitOrder.mandateId}`}>{debitOrder.mandateReference}</Link>
            ),
          },
        ]}
      />
    </Card>
  );
}

function Details({ transaction }: { transaction: Transaction }) {
  const { dispute, debitOrder } = transaction;
  const { badges, items } = typeDetails(transaction);
  return (
    <div className={styles.stack}>
      <Card>
        <div className={styles.summary}>
          <p className={styles.amount}>{formatMoney(transaction.amount, transaction.currency)}</p>
          <div className={styles.badges}>{badges}</div>
        </div>
        <DescriptionList items={items} />
        {/* The API decides eligibility; the action is simply absent when it says no. */}
        {transaction.eligibility.canDispute ? (
          <div className={styles.actions}>
            <ButtonLink to={`/transactions/${transaction.id}/dispute`}>Dispute</ButtonLink>
          </div>
        ) : null}
      </Card>
      {dispute ? (
        <Card title="Dispute">
          <DescriptionList
            items={[
              { label: 'Reference', value: dispute.reference },
              { label: 'Status', value: disputeStatusLabel(dispute.status) },
            ]}
          />
          <div className={styles.actions}>
            <ButtonLink to={`/disputes/${dispute.id}`} variant="secondary">
              View dispute progress
            </ButtonLink>
          </div>
        </Card>
      ) : null}
      {debitOrder ? <MandateCard debitOrder={debitOrder} /> : null}
    </div>
  );
}

export function TransactionDetailPage() {
  const { id = '' } = useParams();
  const query = useTransaction(id);

  if (query.isPending) {
    return (
      <>
        <PageHeader title={TITLE} back={{ to: '/transactions', label: BACK_LABEL }} />
        <Spinner label="Loading transaction…" />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title={TITLE} back={{ to: '/transactions', label: BACK_LABEL }} />
        <ErrorState
          problem={toProblem(query.error)}
          title="We could not load this transaction"
          onRetry={() => void query.refetch()}
        />
      </>
    );
  }
  const transaction = query.data;
  return (
    <>
      <PageHeader
        title={transaction.counterpartyName}
        description={transactionTypeLabel(transaction.type)}
        back={{ to: transactionListPath(transaction.type), label: BACK_LABEL }}
      />
      <Details transaction={transaction} />
    </>
  );
}
