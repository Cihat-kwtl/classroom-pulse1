"use client";

import App from "./App";
import { AppProvider } from "./lib/store";

export default function Home() {
  return <AppProvider><App /></AppProvider>;
}
