"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";

const menu = [
  { href: "/", label: "Home" },
  {
    href: "/mobile-home-skirting/",
    label: "Mobile Home Skirting",
    children: [
      { href: "/traditional-skirting/", label: "Traditional Skirting" },
      { href: "/rock-skirting/", label: "Rock Skirting" },
      { href: "/premium-skirting/", label: "Premium Skirting" },
    ],
  },
  { href: "/home-financing/", label: "Home Financing" },
  { href: "/blog/", label: "Blog" },
  { href: "/tips/", label: "Tips" },
  { href: "/about-author/", label: "About" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Mobile Homes & Beyond home">
          <Logo />
        </Link>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen(!open)}
        >
          <span className="sr-only">Menu</span>
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
        <nav id="site-nav" className={`site-nav${open ? " open" : ""}`}>
          <ul>
            {menu.map((m) => (
              <li key={m.href} className={m.children ? "has-children" : undefined}>
                <Link href={m.href} onClick={() => setOpen(false)}>
                  {m.label}
                </Link>
                {m.children && (
                  <ul className="sub-menu">
                    {m.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} onClick={() => setOpen(false)}>
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
