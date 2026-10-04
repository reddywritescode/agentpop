import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import { App } from "./App";
import { ApiProvider } from "./api/provider";
import { AuthProvider } from "./auth/session";
import { AdminSessionProvider } from "./admin/session";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdminSessionProvider>
          <ApiProvider>
            <App />
          </ApiProvider>
        </AdminSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
