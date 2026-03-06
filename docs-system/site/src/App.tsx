import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { GuidePage } from './pages/guide/GuidePage';
import { QuickStartPage } from './pages/guide/QuickStartPage';
import { APIPage } from './pages/api/APIPage';
import { ExamplesPage } from './pages/examples/ExamplesPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/guide/quick-start" element={<QuickStartPage />} />
        <Route path="/api" element={<APIPage />} />
        <Route path="/api/:className" element={<APIPage />} />
        <Route path="/examples" element={<ExamplesPage />} />
        <Route path="/examples/:exampleId" element={<ExamplesPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
