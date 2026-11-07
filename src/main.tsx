import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  }).catch(() => {});
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
