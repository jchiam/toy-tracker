import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useMatch,
  useParams,
  useSearchParams,
} from 'react-router';
import type { GamePageProps } from '@/lib/games';
import { AuthGate } from '@/components/AuthGate';
import { PARTS, PRODUCTS, PRODUCT_PARTS, resolveProductParts } from '@/lib/br/catalog';
import { brRoutes } from '@/lib/br/routes';
import { ProductCatalog } from './ProductCatalog';
import { ProductDetail } from './ProductDetail';
import { PartCatalog } from './PartCatalog';
import { InventorySegment } from './InventorySegment';
import './BrPage.css';

/** Sends the game root to Catalog, honouring the earlier query-string links. */
function RootRedirect() {
  const [params] = useSearchParams();
  const productCode = params.get('product');
  if (productCode) return <Navigate to={brRoutes.product(productCode)} replace />;
  if (params.get('view') === 'parts') return <Navigate to={brRoutes.parts} replace />;
  return <Navigate to={brRoutes.catalog} replace />;
}

function ProductRoute() {
  const { code } = useParams();
  const product = PRODUCTS.find((p) => p.code === code);

  if (product) {
    return <ProductDetail product={product} parts={resolveProductParts(product.code)} />;
  }
  return (
    <>
      <p className="br-empty">No product with code {code}.</p>
      <ProductCatalog products={PRODUCTS} />
    </>
  );
}

function CatalogSegment() {
  // Products stays current on a product's detail, so only Parts is matched.
  const showParts = useMatch(brRoutes.parts) !== null;

  return (
    <>
      <nav className="br-tabs" aria-label="Catalog views">
        <Link to={brRoutes.catalog} aria-current={showParts ? undefined : 'page'}>
          Products
        </Link>
        <Link to={brRoutes.parts} aria-current={showParts ? 'page' : undefined}>
          Parts
        </Link>
      </nav>

      <Routes>
        <Route index element={<ProductCatalog products={PRODUCTS} />} />
        <Route path="products/:code" element={<ProductRoute />} />
        <Route
          path="parts"
          element={<PartCatalog parts={PARTS} products={PRODUCTS} productParts={PRODUCT_PARTS} />}
        />
        <Route path="*" element={<Navigate to={brRoutes.catalog} replace />} />
      </Routes>
    </>
  );
}

/** Stands in for a segment whose features do not exist yet. Reads no user data. */
function SegmentPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="br-placeholder" aria-labelledby="br-placeholder-title">
      <h2 id="br-placeholder-title">{title}</h2>
      <p>
        {title} is not available yet. {description}
      </p>
    </section>
  );
}

function BrShell({ userId }: { userId: string }) {
  return (
    <>
      <header className="br-header">
        <h1>Baraba Ride</h1>
        <nav className="br-segments" aria-label="Segments">
          <NavLink to={brRoutes.catalog}>Catalog</NavLink>
          <NavLink to={brRoutes.inventory}>Inventory</NavLink>
          <NavLink to={brRoutes.builds}>Builds</NavLink>
        </nav>
      </header>

      <Routes>
        <Route index element={<RootRedirect />} />
        <Route path="catalog/*" element={<CatalogSegment />} />
        <Route path="inventory/*" element={<InventorySegment userId={userId} />} />
        <Route
          path="builds"
          element={
            <SegmentPlaceholder
              title="Builds"
              description="It will hold the machines you plan and build from your parts."
            />
          }
        />
        <Route path="*" element={<Navigate to={brRoutes.catalog} replace />} />
      </Routes>

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
      <BrShell userId={session.user.id} />
    </main>
  );
}
