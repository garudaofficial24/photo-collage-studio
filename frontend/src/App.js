import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CollageEditor from "@/components/CollageEditor";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CollageEditor />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;