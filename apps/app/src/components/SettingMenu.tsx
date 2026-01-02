/**
 * Setting Menu
 * @file src/components/SettingMenu.tsx
 */

import { storageManager } from "@/lib/storage";
import { isPasskeySupported } from "@/utils/environment";
import { LogOut, WalletIcon, RefreshCw, FingerprintIcon } from "lucide-react";
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
  onRemovePasskey?: () => void;
}

export function SettingMenu({ children, onAddPasskey, onRemovePasskey }: SettingMenuProps) {
  const isAuthenticated = useIsAuthenticated();
  const { logout } = useAuthActions();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [canAddPasskey, setCanAddPasskey] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const { autoSyncEnabled, setAutoSyncEnabled } = useAutoSync();

  // Check if user can add passkey (wallet-based account without passkey)
  useEffect(() => {
    if (!isAuthenticated) {
      setCanAddPasskey(false);
      setPasskeyEnabled(false);
      return;
    }

    const checkPasskeyStatus = async () => {
      try {
        // Check if passkey is supported on this device
        if (!isPasskeySupported()) {
          setCanAddPasskey(false);
          setPasskeyEnabled(false);
          return;
        }

        // Get account data
        const accountData = await storageManager.getAccountData();
        if (!accountData) {
          setCanAddPasskey(false);
          setPasskeyEnabled(false);
          return;
        }

        // Check if passkey unlock is already enabled for this wallet
        const accountId = accountData.accountId;
        const isEnabled = await storageManager.isPasskeyUnlockEnabled(accountId);
        setCanAddPasskey(!isEnabled);
        setPasskeyEnabled(isEnabled);
      } catch (error) {
        console.error("Failed to check passkey status:", error);
        setCanAddPasskey(false);
        setPasskeyEnabled(false);
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

  const handleRemovePasskey = useCallback(() => {
    onRemovePasskey?.();
  }, [onRemovePasskey]);

  // Don't show menu if not authenticated
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-gray-700 bg-gray-900 p-1">
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
              <FingerprintIcon className="mr-2 h-4 w-4" />
              Add Passkey
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-800" />
          </>
        )}
        {passkeyEnabled && (
          <>
            <DropdownMenuItem
              onClick={handleRemovePasskey}
              className="cursor-pointer text-yellow-400 hover:bg-gray-800 hover:text-yellow-300 focus:bg-gray-800 focus:text-yellow-300"
            >
              <FingerprintIcon className="mr-2 h-4 w-4" />
              Remove Passkey
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
