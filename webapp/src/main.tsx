import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { createMockGameService } from './services/mockGameService';
import { GameProvider } from './useGame';
import './styles.css';

// Swap for createChainGameService() once NFTs exist — pages stay unchanged.
const service = createMockGameService();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider service={service}>
      <App />
    </GameProvider>
  </StrictMode>,
);
