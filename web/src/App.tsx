import { BrowserRouter, Routes, Route, Outlet, Link } from 'react-router-dom';
import { WalletProvider } from './lib/wallet';
import { AuthProvider } from './lib/auth';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { Container, btn } from './components/ui';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { HowItWorks } from './pages/HowItWorks';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Docs } from './pages/Docs';

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <Container className="py-32 text-center">
      <div className="text-5xl font-semibold text-white">404</div>
      <p className="mt-3 text-slate-400">This page wandered off-chain.</p>
      <Link to="/" className={`mt-6 inline-flex ${btn('primary')}`}>
        Back home
      </Link>
    </Container>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/app" element={<Dashboard />} />
              <Route path="/app/analytics" element={<Analytics />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </WalletProvider>
    </BrowserRouter>
  );
}
