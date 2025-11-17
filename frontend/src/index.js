import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver loop error
const resizeObserverErr = /^ResizeObserver loop completed with undelivered notifications/;
const consoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && resizeObserverErr.test(args[0])) {
    return;
  }
  consoleError(...args);
};

// Handle uncaught errors
window.addEventListener('error', (event) => {
  if (resizeObserverErr.test(event.message)) {
    event.stopImmediatePropagation();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
