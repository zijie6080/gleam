import type { MetadataRoute } from "next";

// PWA manifest：添加到主屏幕后以独立窗口打开，图标与夜色主题一致
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "拾梦 Gleam",
    short_name: "拾梦",
    description: "把梦境变成可被看见、可被回应、可被珍藏的地方",
    start_url: "/capture",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1026",
    theme_color: "#0B1026",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
