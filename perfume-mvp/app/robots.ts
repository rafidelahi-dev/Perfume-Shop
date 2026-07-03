import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/superadmin/",
          "/login",
          "/signup",
          "/reset",
          "/api/",
        ],
      },
    ],
    sitemap: "https://www.cloudperfumebd.com/sitemap.xml",
  };
}
