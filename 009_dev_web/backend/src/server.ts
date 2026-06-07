import express from 'express';

import authRoutes from './presentation/routes/auth.routes';
import assetRoutes from './presentation/routes/asset.routes';
import etlRoutes from './presentation/routes/etl.routes';
import analysisRoutes from './presentation/routes/analysis.routes';

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/etl', etlRoutes);
app.use('/api/analysis', analysisRoutes);

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'datasphere-backend' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
