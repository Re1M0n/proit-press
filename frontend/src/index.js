import CssBaseline from "@mui/material/CssBaseline";
import React from "react";
import { createRoot } from "react-dom/client";
import { initializeLoading } from "./utils/showLoading";
import { setupGlobalErrorHandlers } from "./utils/errorHandler";
import ErrorBoundary from "./components/ErrorBoundary";

import App from "./App";
import { initializeNativeApp } from "./utils/nativeApp";

const finishLoading = initializeLoading();
const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

setupGlobalErrorHandlers();

initializeNativeApp().finally(() => {
    root.render(
        <CssBaseline>
            <ErrorBoundary componentName="App">
                <App />
            </ErrorBoundary>
        </CssBaseline>
    );
    setTimeout(finishLoading, 1000);
});