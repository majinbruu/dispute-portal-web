import { TabNav } from '../../components/TabNav';

const TABS = [
  { to: '/transactions', label: 'My transactions' },
  { to: '/disputes', label: 'Dispute history' },
];

/** The two tabs shared by the transaction list and the dispute history. */
export function HistoryTabs() {
  return <TabNav label="Transactions and disputes" tabs={TABS} />;
}
