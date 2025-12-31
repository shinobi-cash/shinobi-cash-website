/**
 * Setting Menu
 * @file src/components/SettingMenu.tsx
 */

import { storageManager } from "@/lib/storage";
import { isPasskeySupported } from "@/utils/environment";
import { Fingerprint, LogOut, WalletIcon, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Switch } from "@workspace/ui/components/switch";
import { useIsAuthenticated, useAuthActions } from "@/features/auth/hooks/useAuthStore";
import { useAutoSync } from "@/hooks/useAutoSync";

interface SettingMenuProps {
  children: React.ReactNode;
  onAddPasskey?: () => void;
}

export function SettingMenu({ children, onAddPasskey }: SettingMenuProps) {
  const isAuthenticated = useIsAuthenticated();
  const { logout } = useAuthActions();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [canAddPasskey, setCanAddPasskey] = useState(false);
  const { autoSyncEnabled, setAutoSyncEnabled } = useAutoSync();

  // Check if user can add passkey (wallet-based account without passkey)
  useEffect(() => {
    if (!isAuthenticated) {
      setCanAddPasskey(false);
      return;
    }

    const checkPasskeyStatus = async () => {
      try {
        // Check if passkey is supported on this device
        if (!isPasskeySupported()) {
          setCanAddPasskey(false);
          return;
        }

        // Get account data to check if it's wallet-based
        const accountData = await storageManager.getAccountData();
        if (!accountData) {
          setCanAddPasskey(false);
          return;
        }

        // Wallet accounts (type: "wallet") can add passkeys
        // Passkey accounts (type: "passkey") already have passkeys
        if (accountData.type === "passkey") {
          setCanAddPasskey(false);
          return;
        }

        // For wallet accounts, check if passkey already exists
        const accountId = accountData.accountId;
        const hasPasskey = await storageManager.passkeyExists(accountId);
        setCanAddPasskey(!hasPasskey);
      } catch (error) {
        console.error("Failed to check passkey status:", error);
        setCanAddPasskey(false);
      }
    };

    checkPasskeyStatus();
  }, [isAuthenticated]);

  const handleLogout = useCallback(async () => {
    await logout();
    // Also disconnect wallet when logging out
    if (isConnected) {
      disconnect();
    }
  }, [logout, isConnected, disconnect]);

  const handleDisconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleAddPasskey = useCallback(() => {
    onAddPasskey?.();
  }, [onAddPasskey]);

  // Don't show menu if not authenticated
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-gray-700 bg-gray-900 p-1">
        {/* Notes Section */}
        <DropdownMenuLabel className="px-2 text-xs font-semibold text-gray-500">
          Notes
        </DropdownMenuLabel>

        {/* Auto-sync toggle */}
        <div className="flex items-center justify-between gap-4 px-2 py-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">Auto Sync</span>
          </div>
          <Switch
            checked={autoSyncEnabled}
            onCheckedChange={setAutoSyncEnabled}
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
        <DropdownMenuSeparator className="bg-gray-800" />

       {/* Notes Section */}
        <DropdownMenuLabel className="px-2 text-xs font-semibold text-gray-500">
          Account
        </DropdownMenuLabel>

        {canAddPasskey && (
          <>
            <DropdownMenuItem
              onClick={handleAddPasskey}
              className="cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Add Passkey
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-800" />
          </>
        )}
        {isConnected && (
          <DropdownMenuItem
            onClick={handleDisconnectWallet}
            className="cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
          >
            <WalletIcon className="mr-2 h-4 w-4" />
            Disconnect Wallet
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-400 hover:bg-gray-800 hover:text-red-300 focus:bg-gray-800 focus:text-red-300"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
