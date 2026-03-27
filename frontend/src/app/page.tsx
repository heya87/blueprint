"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import styles from "./page.module.css";

const steps = [
  {
    number: "01",
    title: "Rename the app",
    body: "Run ./init.sh <appname> to replace all blueprint placeholders across Kotlin packages, config files, and compose files.",
  },
  {
    number: "02",
    title: "Generate JWT keys",
    body: "openssl genrsa -out jwt-private.pem 2048 then convert to PKCS#8. Place both PEM files in backend/src/main/resources/.",
  },
  {
    number: "03",
    title: "Configure environment",
    body: "Copy .env.example to .env. Set DB_PASSWORD, API URLs, and CORS origin for your new domain.",
  },
  {
    number: "04",
    title: "Add your first feature",
    body: "New REST endpoints go in backend/.../resource/, business logic in .../service/. Add a Flyway migration for any new tables.",
  },
  {
    number: "05",
    title: "Deploy with Coolify",
    body: "Push to main. GitHub Actions builds the backend and triggers Coolify webhooks for both services automatically.",
  },
];

const stack = [
  { label: "Backend", value: "Quarkus + Kotlin" },
  { label: "Frontend", value: "Next.js (App Router)" },
  { label: "Database", value: "PostgreSQL + Flyway" },
  { label: "Auth", value: "SmallRye JWT (RSA, httpOnly cookie)" },
  { label: "Styling", value: "CSS Modules" },
  { label: "Deploy", value: "Docker + Coolify" },
];

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <ProtectedRoute>
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.logo}>Blueprint</span>
          <div className={styles.headerRight}>
            <span className={styles.email}>{user?.email}</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.hero}>
            <h1>Your new app starts here</h1>
            <p>This blueprint ships with auth, a full stack, and a deployment pipeline out of the box. Fork it, rename it, and build what matters.</p>
            <div className={styles.heroCtas}>
              <a href="https://github.com" className={styles.btnPrimary}>View on GitHub</a>
              <Link href="/register" className={styles.btnSecondary}>Create another account</Link>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Stack</h2>
            <div className={styles.stackGrid}>
              {stack.map((s) => (
                <div key={s.label} className={styles.stackCard}>
                  <span className={styles.stackLabel}>{s.label}</span>
                  <span className={styles.stackValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2>Getting started with a new app</h2>
            <ol className={styles.steps}>
              {steps.map((s) => (
                <li key={s.number} className={styles.step}>
                  <span className={styles.stepNumber}>{s.number}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
