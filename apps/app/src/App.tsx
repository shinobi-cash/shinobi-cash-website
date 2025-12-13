import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { PasswordAuthDrawer } from "@/components/features/auth/PasswordAuthDrawer";
import { MainScreen } from "@/components/screens/MainScreen";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";
import { TransactionTrackingProvider } from "./hooks/transactions/useTransactionTracking";

function AppContent() {
  const { isRestoringSession, quickAuthState } = useAuth();

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

  // Show normal app after session restoration is complete
  return (
    <>
      <MainScreen />
      <PasswordAuthDrawer />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NavigationProvider>
          <AuthProvider>
            <TransactionTrackingProvider>
              <AppContent />
              <Toaster />
            </TransactionTrackingProvider>
          </AuthProvider>
        </NavigationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
