import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "4rem 1rem", textAlign: "center" }}>
      <div>
        <h1>Page not found</h1>
        <p>The page you requested does not exist.</p>
        <Link href="/">Return to Nazira</Link>
      </div>
    </main>
  );
}