import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app.jsx';

// Served from /MrCVWeb/ on gh-pages, from / locally.
const _p = window.location.pathname;
const basename = _p === '/MrCVWeb' || _p.startsWith('/MrCVWeb/') ? '/MrCVWeb' : undefined;

// App styles (Bootstrap SCSS kept)
import './assets/scss/style.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
