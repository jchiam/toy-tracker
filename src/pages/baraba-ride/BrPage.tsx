import { Link, useSearchParams } from 'react-router';
import type { GamePageProps } from '@/lib/games';
import { AuthGate } from '@/components/AuthGate';
import { PARTS, PRODUCTS, PRODUCT_PARTS, resolveProductParts } from '@/lib/br/catalog';
import { ProductCatalog } from './ProductCatalog';
import { ProductDetail } from './ProductDetail';
import { PartCatalog } from './PartCatalog';
import './BrPage.css';

/** Views are addressed by query string so the game keeps its single route. */
function BrCatalog() {
  const [params] = useSearchParams();
  const productCode = params.get('product');
  const showParts = params.get('view') === 'parts' && !productCode;
  const product = productCode ? PRODUCTS.find((p) => p.code === productCode) : undefined;

  return (
    <>
      <header className="br-header">
        <h1>Baraba Ride</h1>
        <nav className="br-tabs" aria-label="Catalog views">
          <Link to={{ search: '' }} aria-current={showParts ? undefined : 'page'}>
            Products
          </Link>
          <Link to={{ search: '?view=parts' }} aria-current={showParts ? 'page' : undefined}>
            Parts
          </Link>
        </nav>
      </header>

      {showParts ? (
        <PartCatalog parts={PARTS} products={PRODUCTS} productParts={PRODUCT_PARTS} />
      ) : product ? (
        <ProductDetail product={product} parts={resolveProductParts(product.code)} />
      ) : (
        <>
          {productCode && <p className="br-empty">No product with code {productCode}.</p>}
          <ProductCatalog products={PRODUCTS} />
        </>
      )}

      <footer className="br-attribution">
        Product facts from the official Baraba Ride site. ©BANDAI. Unofficial fan project.
      </footer>
    </>
  );
}

export function BrPage({ session, isAuthLoading, onSignIn }: GamePageProps) {
  if (isAuthLoading) {
    return (
      <main className="main-content">
        <p>Checking authentication...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="main-content">
        <AuthGate onSignIn={onSignIn} />
      </main>
    );
  }

  return (
    <main className="main-content">
      <BrCatalog />
    </main>
  );
}
