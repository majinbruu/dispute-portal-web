import { TabNav } from '../../components/TabNav';

const TABS = [
  { to: '/debit-orders', label: 'My debit orders' },
  { to: '/disputes', label: 'Dispute history' },
];

/** The two tabs shared by the debit order list and the dispute history. */
export function HistoryTabs() {
  return <TabNav label="Debit orders and disputes" tabs={TABS} />;
}
