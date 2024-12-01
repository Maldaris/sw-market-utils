import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter, RouteObject } from 'react-router';
import ShopParser from './pages/ShopParser';
import BookFromDoc from './pages/BookFromDoc';
import AdramisLogo from './assets/adramislogo.webp';
import StoneworksLogo from './assets/swlogo.webp';
import './styles.scss';

const App = () => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <div className="app">
      <header className="app-header">
        <button className="menu-button" onClick={toggleDrawer}>
          <i className="fas fa-bars"></i>
        </button>
        <h1>Stoneworks Utilities</h1>
      </header>
      <nav className={`drawer ${drawerOpen ? 'open' : ''}`}>
        <ul>
          <li>
            <a href="/" onClick={toggleDrawer}>Shop Parser</a>
          </li>
          <li>
            <a href="/book-from-doc" onClick={toggleDrawer}>Book From Document</a>
          </li>
        </ul>
      </nav>
      <main className="app-content">
        <RouterProvider router={router} />
      </main>
      <footer className="text-center mt-5">
        <p id="footer-text">Made with <span>&hearts;</span> by the 
          <img src={AdramisLogo} alt="Adramis Mall" style={({ height: '45px' })}/> Adramis Mall, 
          for <img src={StoneworksLogo} alt="Stoneworks" style={({ height: '45px' })}/> Stoneworks
        </p>
      </footer>
    </div>
  );
};

const routes: RouteObject[] = [
  {
    path: "/",
    element: <ShopParser />
  },
  {
    path: "/book-from-doc",
    element: <BookFromDoc />
  }
];

const router = createBrowserRouter(routes);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);