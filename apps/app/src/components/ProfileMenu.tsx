/**
 * Setting Menu
 * @file src/components/ProfileMenu.tsx
 */

import { storageManager } from "@/lib/storage";
import { isPasskeySupported } from "@/utils/environment";
import {
  LogOut,
  WalletIcon,
  RefreshCw,
  FingerprintIcon,
  MoreHorizontalIcon,
  CircleUserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { Switch } from "@workspace/ui/components/switch";
import { useIsAuthenticated, useAuthActions } from "@/features/auth/hooks/useAuthStore";
import { useAutoSync } from "@/hooks/useAutoSync";
import { AddPasskeyModal } from "@/features/auth/components/AddPasskeyModal";
import { RemovePasskeyModal } from "@/features/auth/components/RemovePasskeyModal";

export function ProfileMenu() {
  const isAuthenticated = useIsAuthenticated();
  const { logout } = useAuthActions();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [canAddPasskey, setCanAddPasskey] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [showAddPasskeyModal, setShowAddPasskeyModal] = useState(false);
  const [showRemovePasskeyModal, setShowRemovePasskeyModal] = useState(false);
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

  const handleAddPasskey = () => {
    setShowAddPasskeyModal(true);
  };

  const handleRemovePasskey = () => {
    setShowRemovePasskeyModal(true);
  };

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

  // Don't show menu if not authenticated
  if (!isAuthenticated) {
    return <></>;
  }

  return (
    <>
      <AddPasskeyModal open={showAddPasskeyModal} onOpenChange={setShowAddPasskeyModal} />
      <RemovePasskeyModal open={showRemovePasskeyModal} onOpenChange={setShowRemovePasskeyModal} />
      <ButtonGroup>
        <Button variant="outline">
          <CircleUserRound className="h-4 w-4" />
          Profile
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More Options">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-gray-700 bg-gray-900 p-1">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 text-xs font-semibold text-gray-500">
                Notes
              </DropdownMenuLabel>
              <DropdownMenuItem>
                <RefreshCw />
                Auto Sync
                <Switch
                  checked={autoSyncEnabled}
                  onCheckedChange={setAutoSyncEnabled}
                  className="data-[state=checked]:bg-orange-500"
                />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 text-xs font-semibold text-gray-500">
                Account
              </DropdownMenuLabel>
              {canAddPasskey && (
                <>
                  <DropdownMenuItem
                    onClick={handleAddPasskey}
                    className="cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
                  >
                    <FingerprintIcon className="h-4 w-4" />
                    Add Passkey
                  </DropdownMenuItem>
                </>
              )}

              {passkeyEnabled && (
                <DropdownMenuItem
                  onClick={handleRemovePasskey}
                  className="cursor-pointer text-yellow-400 hover:bg-gray-800 hover:text-yellow-300 focus:bg-gray-800 focus:text-yellow-300"
                >
                  <FingerprintIcon className="h-4 w-4" />
                  Remove Passkey
                </DropdownMenuItem>
              )}

              {isConnected && (
                <DropdownMenuItem
                  onClick={handleDisconnectWallet}
                  className="cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
                >
                  <WalletIcon className="h-4 w-4" />
                  Disconnect Wallet
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-400 hover:bg-gray-800 hover:text-red-300 focus:bg-gray-800 focus:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    </>
  );
}
