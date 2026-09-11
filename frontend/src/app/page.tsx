"use client";

import { usePathname } from "next/navigation";
import LoginPage from "@/auth/login/page";
import RegisterPage from "@/auth/register/page";
import DashboardPage from "@/dashboard/page";
import ProjectsPage from "@/projects/page";
import ProjectHistoryPage from "@/projects/history/page";
import ProjectPage from "@/projects/[id]/page";
import GeneratePage from "@/projects/[id]/generate/page";
import BrandbookPage from "@/projects/[id]/brandbook/page";
import HistoryPage from "@/history/page";

export default function AppRouter() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login" || pathname === "/auth/login") return <LoginPage />;
  if (pathname === "/register" || pathname === "/auth/register") return <RegisterPage />;
  if (pathname === "/dashboard") return <DashboardPage />;
  if (pathname === "/projects") return <ProjectsPage />;
  if (pathname === "/projects/history") return <ProjectHistoryPage />;
  if (pathname === "/history") return <HistoryPage />;
  if (/^\/projects\/[^/]+\/generate\/?$/.test(pathname)) return <GeneratePage />;
  if (/^\/projects\/[^/]+\/brandbook\/?$/.test(pathname)) return <BrandbookPage />;
  if (/^\/projects\/[^/]+\/?$/.test(pathname)) return <ProjectPage />;

  return (
    <main className="resultPage">
      <section className="card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <a className="generate" href="/projects">Back to projects</a>
      </section>
    </main>
  );
}
