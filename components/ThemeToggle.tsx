"use client";

import React from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme | null>(null);

  React.useEffect(() => {
    const stored = window.localStorage.getItem("mh-theme") as Theme | null;
    const initial =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("mh-theme", next);
  };

  // Nothing rendered until the client knows the theme — avoids a flash of the
  // wrong icon on hydration.
  if (!theme) return <div style={{ width: 36, height: 34 }} aria-hidden />;

  return (
    <button
      type="button"
      className="btn"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      style={{ padding: "7px 11px", lineHeight: 1 }}
    >
      <span aria-hidden style={{ fontSize: 15 }}>
        {theme === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
