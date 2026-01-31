/**
 * Setting Menu
 * @file src/components/ProfileMenu.tsx
 */

import { isPasskeySupported } from "@/utils/environment";
import { LogOut, WalletIcon, FingerprintIcon, CircleUserRound, ChevronDown } from "lucide-react";
import { useCallback, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { AddPasskeyModal } from "./AddPasskeyModal";
import { RemovePasskeyModal } from "./RemovePasskeyModal";
import { useSnapshot } from "valtio";
import { AuthController } from "@/controllers/AuthController";

export function ProfileMenu() {
  const state = useSnapshot(AuthController.state);
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [showAddPasskeyModal, setShowAddPasskeyModal] = useState(false);
  const [showRemovePasskeyModal, setShowRemovePasskeyModal] = useState(false);

  const isAuthenticated = state.state.status === "authenticated";

  // Get passkey status from auth state
  const passkeyEnabled = isAuthenticated ? state.state.session.passkeyEnabled : false;

  // Check if user can add passkey (passkey supported and not already enabled)
  const canAddPasskey = isAuthenticated && isPasskeySupported() && !passkeyEnabled;

  const handleAddPasskey = () => {
    setShowAddPasskeyModal(true);
  };

  const handleRemovePasskey = () => {
    setShowRemovePasskeyModal(true);
  };

  const handleLogout = useCallback(async () => {
    await AuthController.logout();
    // Also disconnect wallet when logging out
    if (isConnected) {
      disconnect();
    }
  }, [isConnected, disconnect]);

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/10 hover:text-white sm:px-3"
          >
            <CircleUserRound className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-border bg-background w-56 p-1">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground px-2 text-xs font-semibold">
              Account
            </DropdownMenuLabel>
            {canAddPasskey && (
              <DropdownMenuItem
                onClick={handleAddPasskey}
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground cursor-pointer"
              >
                <FingerprintIcon className="h-4 w-4" />
                Enable Quick Unlock
              </DropdownMenuItem>
            )}

            {passkeyEnabled && (
              <DropdownMenuItem
                onClick={handleRemovePasskey}
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground cursor-pointer"
              >
                <FingerprintIcon className="h-4 w-4" />
                Remove Quick Unlock
              </DropdownMenuItem>
            )}

            {isConnected && (
              <DropdownMenuItem
                onClick={handleDisconnectWallet}
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground cursor-pointer"
              >
                <WalletIcon className="h-4 w-4" />
                Disconnect Wallet
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={handleLogout}
              className="hover:bg-muted focus:bg-muted cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
