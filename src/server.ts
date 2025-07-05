import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`AwareeAI backend running on port ${PORT}`);
});