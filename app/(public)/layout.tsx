import "./public-site.css";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="public-routes">{children}</div>;
}
