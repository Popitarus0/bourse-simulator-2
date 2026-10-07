import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface LocalSession {
  user: {
    id: string;
    email: string;
    user_metadata: { name: string };
  };
  access_token: string;
}

interface LocalAccount {
  id: string;
  email: string;
  password: string;
  name: string;
}

interface AuthCtx {
  session: LocalSession | null;
  isAdmin: boolean;
  ready: boolean;
  supabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name?: string) => Promise<string | null>;
  resetPassword: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const USERS_KEY = "nexus-local-users-v1";
const SESSION_KEY = "nexus-local-session-v1";

const Ctx = createContext<AuthCtx>({
  session: null,
  isAdmin: false,
  ready: false,
  supabaseConfigured: false,
  signIn: async () => "Connexion indisponible.",
  signUp: async () => "Inscription indisponible.",
  resetPassword: async () => "Réinitialisation indisponible.",
  signOut: async () => {},
});

function readUsers(): LocalAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((u): u is LocalAccount =>
      !!u &&
      typeof u.id === "string" &&
      typeof u.email === "string" &&
      typeof u.password === "string" &&
      typeof u.name === "string",
    );
  } catch {
    return [];
  }
}

function writeUsers(users: LocalAccount[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function makeId(email: string) {
  const normalized = email.trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return "local-" + (hash >>> 0).toString(36);
}

function toSession(user: LocalAccount): LocalSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: { name: user.name },
    },
    access_token: "local:" + user.id,
  };
}

function readSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as LocalSession;
    if (!value?.user?.id || !value?.user?.email) return null;
    return value;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return "E-mail et mot de passe requis.";

    const user = readUsers().find((u) => u.email === normalized);
    if (!user || user.password !== password) return "E-mail ou mot de passe incorrect.";

    const next = toSession(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
    return null;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) return "Adresse e-mail invalide.";
    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";

    const users = readUsers();
    if (users.some((u) => u.email === normalized)) return "Un compte existe déjà avec cette adresse.";

    const user: LocalAccount = {
      id: makeId(normalized),
      email: normalized,
      password,
      name: name?.trim().slice(0, 32) || normalized.split("@")[0].slice(0, 32) || "Trader",
    };
    writeUsers([...users, user]);

    const next = toSession(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
    return null;
  };

  const resetPassword = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    if (password.length < 8) return "Le nouveau mot de passe doit contenir au moins 8 caractères.";

    const users = readUsers();
    const index = users.findIndex((u) => u.email === normalized);
    if (index < 0) return "Aucun compte local trouvé avec cette adresse.";

    const nextUser = { ...users[index], password };
    users[index] = nextUser;
    writeUsers(users);

    const next = toSession(nextUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
    return null;
  };

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return (
    <Ctx.Provider value={{
      session,
      isAdmin: false,
      ready,
      supabaseConfigured: true,
      signIn,
      signUp,
      resetPassword,
      signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
