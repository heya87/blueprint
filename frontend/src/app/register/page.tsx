"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    setPending(true);
    setError(null);
    try {
      await register(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1>Register</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="new-password" />
          </div>
          {error && <p className={styles.error}>⚠ {error}</p>}
          <button type="submit" disabled={pending} className={styles.submit}>
            {pending ? "Registering…" : "Register"}
          </button>
        </form>
        <p className={styles.footer}>
          Already have an account? <Link href="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}
