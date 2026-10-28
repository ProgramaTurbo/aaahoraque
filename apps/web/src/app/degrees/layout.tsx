import type { ReactNode } from "react";
import { OrientationProvider } from "@/features/degrees/orientation-session";
import { DegreesNavigation } from "@/features/degrees/degrees-navigation";
export default function DegreesLayout({ children }: { children: ReactNode }) {
  return <OrientationProvider><main className="bg-textured min-h-screen px-5 py-12 md:px-10"><div className="mx-auto max-w-6xl space-y-10"><DegreesNavigation />{children}</div></main></OrientationProvider>;
}
