import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecordPurchaseDialog } from './RecordPurchaseDialog';
import { AddItemsDialog } from './AddItemsDialog';
import './BrPage.css';

const noop = () => {};
const submit = async () => {};

const meta: Meta = {
  title: 'Baraba Ride/Inventory dialogs',
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const RecordPurchase: StoryObj = {
  render: () => <RecordPurchaseDialog open onClose={noop} onSubmit={submit} />,
};

export const AddItems: StoryObj = {
  render: () => <AddItemsDialog open onClose={noop} onSubmit={submit} />,
};

export const AddItemsPhoneWidth: StoryObj = {
  ...AddItems,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
