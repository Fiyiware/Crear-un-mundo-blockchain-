import { createApp } from './app.js';
import { config } from './config.js';

const { app, providers } = createApp();

app.listen(config.port, () => {
  console.log(`Remesas backend escuchando en http://localhost:${config.port}`);
  console.log(`Modo: ${config.providerMode} · Red de liquidación: ${providers.chain.network}`);
});
