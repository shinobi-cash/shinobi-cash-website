"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/SplashScreen";
import { PasswordAuthDrawer } from "@/components/features/auth/PasswordAuthDrawer";
import { MainScreen } from "@/components/screens/MainScreen";
import { sdk } from "@farcaster/miniapp-sdk";

export default function Home() {
  const { isRestoringSession, isAuthenticated, quickAuthState } = useAuth();

  // Call ready() immediately to hide Farcaster native splash screen
  useEffect(() => {
    sdk.actions.ready().catch(console.error);
  }, []);

  // Show custom splash screen during session restoration
  if (isRestoringSession) {
    return (
      <>
        <SplashScreen subtitle="Restoring your session..." />
        {quickAuthState?.show && <PasswordAuthDrawer />}
      </>
    );
  }

  // Show main app
  return (
    <>
      <MainScreen />
      <PasswordAuthDrawer />
    </>
  );
}