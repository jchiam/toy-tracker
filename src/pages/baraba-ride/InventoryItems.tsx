import { useState } from 'react';
import type { BrInventory } from '@/hooks/useBrInventory';
import { groupInstancesByItem, type ItemGroup, type ItemSection } from '@/lib/br/inventory';
import { ACCESSORY_KIND_HEADINGS, SLOT_HEADINGS } from '@/lib/br/labels';
import { ACCESSORY_KINDS, SLOTS, type AccessoryKind, type Slot } from '@/lib/br/types';
import { InstanceList, type InstanceListActions } from './InstanceList';
import { RecordPurchaseDialog } from './RecordPurchaseDialog';
import { AddItemsDialog } from './AddItemsDialog';

interface InventoryItemsProps {
  inventory: BrInventory;
}

function sectionHeading(key: ItemSection['key']): string {
  if ((SLOTS as string[]).includes(key)) return SLOT_HEADINGS[key as Slot];
  if ((ACCESSORY_KINDS as string[]).includes(key)) {
    return ACCESSORY_KIND_HEADINGS[key as AccessoryKind];
  }
  return 'Unknown items';
}

function groupName(group: ItemGroup): string {
  if (!group.item) return group.itemId;
  return group.item.kind === 'part' ? group.item.part.nameEn : group.item.accessory.nameEn;
}

function groupNameJa(group: ItemGroup): string | null {
  if (!group.item) return null;
  const nameJa = group.item.kind === 'part' ? group.item.part.nameJa : group.item.accessory.nameJa;
  return nameJa !== groupName(group) ? nameJa : null;
}

type Dialog = 'purchase' | 'add' | null;

/** Items view: every catalogued item the user owns, grouped, with its instances. */
export function InventoryItems({ inventory }: InventoryItemsProps) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const { purchases, instances, loading, error, actions } = inventory;
  const sections = groupInstancesByItem(instances);

  const listActions: InstanceListActions = {
    onRetire: (id, note) => actions.setInstanceStatus(id, 'retired', note || undefined),
    onReactivate: (id) => actions.setInstanceStatus(id, 'active'),
    onDelete: (id) => actions.deleteInstance(id),
  };

  return (
    <section aria-labelledby="br-inventory-items-title">
      <div className="br-toolbar">
        <h2 id="br-inventory-items-title">Items</h2>
        <div className="br-toolbar-actions">
          <button type="button" onClick={() => setDialog('purchase')}>
            Record purchase
          </button>
          <button type="button" onClick={() => setDialog('add')}>
            Add items
          </button>
        </div>
      </div>

      {error && (
        <p className="br-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="br-loading">Loading inventory...</p>}

      {!loading && !error && sections.length === 0 && (
        <p className="br-empty">
          Your inventory is empty. Record a purchase or add items to get started.
        </p>
      )}

      {sections.map((section) => (
        <section
          key={section.key}
          className="br-slot-group"
          aria-labelledby={`br-inventory-${section.key}`}
        >
          <h3 id={`br-inventory-${section.key}`} className="br-slot-heading">
            {sectionHeading(section.key)}
          </h3>
          <ul className="br-list br-item-groups">
            {section.groups.map((group) => {
              const name = groupName(group);
              const nameJa = groupNameJa(group);
              return (
                <li key={group.itemId}>
                  <details className="br-item-group">
                    <summary>
                      <span className="br-item-name">{name}</span>
                      {nameJa && (
                        <span className="br-name-ja" lang="ja">
                          {nameJa}
                        </span>
                      )}
                      <span className="br-item-counts">
                        <span className="br-count-active">{group.counts.active} active</span>
                        {group.counts.retired > 0 && (
                          <span className="br-count-retired">{group.counts.retired} retired</span>
                        )}
                      </span>
                    </summary>
                    <InstanceList
                      instances={group.instances}
                      purchases={purchases}
                      actions={listActions}
                      label={`${name} instances`}
                    />
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <RecordPurchaseDialog
        open={dialog === 'purchase'}
        onClose={() => setDialog(null)}
        onSubmit={actions.recordPurchase}
      />
      <AddItemsDialog
        open={dialog === 'add'}
        onClose={() => setDialog(null)}
        onSubmit={actions.addInstances}
      />
    </section>
  );
}
