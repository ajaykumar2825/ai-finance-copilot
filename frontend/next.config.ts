import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-popover",
    "@radix-ui/react-select",
    "@radix-ui/react-tabs",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-avatar",
    "@radix-ui/react-progress",
    "@radix-ui/react-switch",
    "@radix-ui/react-separator",
    "@radix-ui/react-slot",
    "@radix-ui/react-collapsible",
    "@radix-ui/react-navigation-menu",
    "@radix-ui/react-command",
    "@radix-ui/react-scroll-area",
    "@radix-ui/react-label",
    "@radix-ui/react-accordion",
    "@radix-ui/react-menubar",
    "@radix-ui/react-alert-dialog",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
