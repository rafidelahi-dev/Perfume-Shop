import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/login",
          "/signup",
          "/reset",
          "/api/",
        ],
      },
    ],
    sitemap: "https://cloudperfumebd.com/sitemap.xml",
  };
}
