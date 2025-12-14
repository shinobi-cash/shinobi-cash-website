"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLayout } from "@/contexts/LayoutContext";
import { SplashScreen } from "@/components/SplashScreen";
import { PasswordAuthDrawer } from "@/components/features/auth/PasswordAuthDrawer";
import { MainScreen } from "@/components/screens/MainScreen";
import { NewLayout } from "@/components/new/NewLayout";
import { sdk } from "@farcaster/miniapp-sdk";

export default function Home() {
  // const { isRestoringSession, quickAuthState } = useAuth();
  // const { version } = useLayout();

  // // Call ready() immediately to hide Farcaster native splash screen
  // useEffect(() => {
  //   sdk.actions.ready().catch(console.error);
  // }, []);

  // // Show custom splash screen during session restoration
  // if (isRestoringSession) {
  //   return (
  //     <>
  //       <SplashScreen subtitle="Restoring your session..." />
  //       {quickAuthState?.show && <PasswordAuthDrawer />}
  //     </>
  //   );
  // }

  // Show new or old layout based on toggle
    return <NewLayout />;

  // // Show old main app
  // return (
  //   <>
  //     <MainScreen />
  //     <PasswordAuthDrawer />
  //   </>
  // );
}