"use client";
import { createContext, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { OrientationProfile } from "./orientation-profile";

type OrientationSession = {
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
  return <Context.Provider value={{ draft, setDraft, profile, setProfile, step, setStep }}>{children}</Context.Provider>;
}
export function useOrientationSession() {
  const value = useContext(Context);
  if (!value) throw new Error("OrientationProvider is required");
  return value;
}
