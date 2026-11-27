import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TabPanel, Tabs } from './Tabs';

const TABS = [
  { id: 'one', label: 'First' },
  { id: 'two', label: 'Second' },
  { id: 'three', label: 'Third' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function Example({ onSelect }: { onSelect?: (id: TabId) => void }) {
  const [selected, setSelected] = useState<TabId>('one');
  return (
    <>
      <Tabs
        idBase="example"
        label="Example tabs"
        tabs={TABS}
        selected={selected}
        onSelect={(id) => {
          setSelected(id);
          onSelect?.(id);
        }}
      />
      <TabPanel idBase="example" selected={selected}>
        <p>Content of {selected}</p>
      </TabPanel>
    </>
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('Tabs', () => {
  it('exposes a named tablist whose selected tab names the panel it controls', () => {
    render(<Example />);

    expect(screen.getByRole('tablist', { name: 'Example tabs' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(tab('First')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Second')).toHaveAttribute('aria-selected', 'false');

    const panel = screen.getByRole('tabpanel', { name: 'First' });
    expect(panel).toHaveTextContent('Content of one');
    expect(tab('First')).toHaveAttribute('aria-controls', panel.id);
    expect(tab('Second')).toHaveAttribute('aria-controls', panel.id);
  });

  it('selects a tab when it is clicked', async () => {
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);

    await userEvent.click(tab('Second'));

    expect(onSelect).toHaveBeenCalledWith('two');
    expect(tab('Second')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Second' })).toHaveTextContent('Content of two');
  });

  it('keeps only the selected tab in the tab order', async () => {
    render(<Example />);

    expect(tab('First')).toHaveAttribute('tabindex', '0');
    expect(tab('Second')).toHaveAttribute('tabindex', '-1');
    expect(tab('Third')).toHaveAttribute('tabindex', '-1');

    await userEvent.tab();
    expect(tab('First')).toHaveFocus();
    await userEvent.tab();
    expect(tab('Second')).not.toHaveFocus();
    expect(tab('Third')).not.toHaveFocus();
  });

  it('moves between tabs with the arrow, Home and End keys, selecting as it goes', async () => {
    render(<Example />);
    await userEvent.tab();

    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Second')).toHaveFocus();
    expect(tab('Second')).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{End}');
    expect(tab('Third')).toHaveFocus();

    // The arrows wrap around at either end.
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('First')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(tab('Third')).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Third' })).toHaveTextContent('Content of three');

    await userEvent.keyboard('{Home}');
    expect(tab('First')).toHaveFocus();
    expect(tab('First')).toHaveAttribute('aria-selected', 'true');
  });

  it('does not report the selected tab being chosen again, and leaves other keys alone', async () => {
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);

    await userEvent.click(tab('First'));
    await userEvent.keyboard('{Home}{ArrowDown}a');

    expect(onSelect).not.toHaveBeenCalled();
    expect(tab('First')).toHaveAttribute('aria-selected', 'true');
  });
});
