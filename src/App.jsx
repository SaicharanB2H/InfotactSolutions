import { BrowserRouter, Routes, Route } from "react-router-dom";

import UploadPage from "./pages/UploadPage";
import CSVPreview from "./pages/CSVPreview";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<UploadPage />}
        />

        <Route
          path="/csv-preview"
          element={<CSVPreview />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;