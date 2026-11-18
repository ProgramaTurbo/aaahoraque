"use client";
import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import {
  orientationStorageKey, readOrientationSession, calculationVersion,
  type OrientationProfile,
} from "./orientation-profile";

type OrientationSession = {
  isRandomProfile: boolean;
  setIsRandomProfile: Dispatch<SetStateAction<boolean>>;
  draft: OrientationProfile | undefined;
  setDraft: Dispatch<SetStateAction<OrientationProfile | undefined>>;
  profile: OrientationProfile | undefined;
  setProfile: Dispatch<SetStateAction<OrientationProfile | undefined>>;
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
};
const Context = createContext<OrientationSession | null>(null);
export function OrientationProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OrientationProfile>();
  const [profile, setProfile] = useState<OrientationProfile>();
  const [step, setStep] = useState(0);
  const [isRandomProfile, setIsRandomProfile] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    // Hydrate before mounting the form so an empty draft cannot overwrite a saved test.
    const timer = setTimeout(() => {
      try {
        const saved = readOrientationSession(sessionStorage.getItem(orientationStorageKey));
        setDraft(saved.draft);
        setProfile(saved.profile);
        setStep(saved.step ?? 0);
        setIsRandomProfile(saved.isRandomProfile ?? false);
      } catch { setStorageAvailable(false); }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready || !storageAvailable) return;
    try {
      if (!draft && !profile) sessionStorage.removeItem(orientationStorageKey);
      else sessionStorage.setItem(orientationStorageKey, JSON.stringify({
        schemaVersion: 2, calculationVersion, draft, profile, step, isRandomProfile,
      }));
    } catch {
      const timer = setTimeout(() => setStorageAvailable(false), 0);
      return () => clearTimeout(timer);
    }
  }, [ready, storageAvailable, draft, profile, step, isRandomProfile]);
  if (!ready) return <p role="status">Recuperando el test de esta pestaña…</p>;
  return <Context.Provider value={{ draft, setDraft, profile, setProfile, step, setStep, isRandomProfile, setIsRandomProfile }}>
    {!storageAvailable && <p role="status">El navegador conserva las respuestas solo mientras esta página siga abierta.</p>}
    {children}
  </Context.Provider>;
}
export function useOrientationSession() {
  const value = useContext(Context);
  if (!value) throw new Error("OrientationProvider is required");
  return value;
}
