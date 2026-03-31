"use client";

import Link from "next/link";
import Image from "next/image";
import { navigation, ctaLink } from "@/lib/navigation";
import { useTheme } from "./ThemeProvider";

export function Footer() {
  const { theme } = useTheme();
  const year = new Date().getFullYear();

  const stampSrc =
    theme === "dark"
      ? "/images/logos/stamp-white.png"
      : "/images/logos/stamp-blue.png";

  return (
    <footer className="bg-bg-secondary border-t border-border-primary">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
        {/* Top: Logo + Nav columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 lg:gap-8">
          {/* Stamp logo column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Image
              src={stampSrc}
              alt="Medina Chamber seal"
              width={80}
              height={80}
              className="mb-4 opacity-80"
            />
            <p className="text-caption max-w-xs">
              Greater Medina Chamber of Commerce. Connecting businesses since 1938.
            </p>
          </div>

          {/* Nav columns */}
          {navigation.map((section) => (
            <div key={section.label}>
              <h4 className="text-overline mb-4">{section.label}</h4>
              <ul className="space-y-2.5">
                {section.children?.map((item) => {
                  const Component = item.external ? "a" : Link;
                  const extraProps = item.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {};
                  return (
                    <li key={item.href}>
                      <Component
                        href={item.href}
                        {...(extraProps as Record<string, string>)}
                        className="text-body-sm text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {item.label}
                      </Component>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border-primary flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-caption">
            &copy; {year} Greater Medina Chamber of Commerce. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/about/contact"
              className="text-caption hover:text-text-primary transition-colors"
            >
              Contact
            </Link>
            <a
              href={ctaLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-caption text-accent hover:text-accent-hover transition-colors font-bold"
            >
              {ctaLink.label} →
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
