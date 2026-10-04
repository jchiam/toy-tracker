import type { Meta, StoryObj } from '@storybook/react-vite';
import { CatalogImage } from './CatalogImage';
import { getProductThumbnailUrl } from '@/lib/imagekit';
import './BrPage.css';

const meta: Meta<typeof CatalogImage> = {
  title: 'Baraba Ride/CatalogImage',
  component: CatalogImage,
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CatalogImage>;

/** Needs `VITE_IMAGEKIT_URL_ENDPOINT`; without it this shows the placeholder too. */
export const Loaded: Story = {
  args: {
    src: getProductThumbnailUrl('/assets/baraba-ride/products/BR-01/1.jpg'),
    alt: 'Storm Falcon',
  },
};

export const NotConfigured: Story = {
  args: { src: null, alt: 'Storm Falcon' },
};

export const FailedToLoad: Story = {
  args: { src: 'https://ik.imagekit.io/does-not-exist/missing.jpg', alt: 'Storm Falcon' },
};
