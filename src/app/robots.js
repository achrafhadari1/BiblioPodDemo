export default function robots() {
  const baseUrl = "https://work-1-fecwncvcbyefqoit.prod-runtime.all-hands.dev";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/_next/", "/admin/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
