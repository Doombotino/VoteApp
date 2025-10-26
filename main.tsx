import React from "react";
import ReactDOM from "react-dom/client";
import VoteApp from "./VoteApp";
import "./index.css"; // Tailwind CSS

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <VoteApp />
  </React.StrictMode>
);
