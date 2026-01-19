/**
 * Setting Menu
 * @file src/components/ProfileMenu.tsx
 */

import { isPasskeySupported } from "@/utils/environment";
import {
  LogOut,
  WalletIcon,
  RefreshCw,
  FingerprintIcon,
  MoreHorizontalIcon,
  CircleUserRound,
} from "lucide-react";
import { useCallback, useState } from "react";
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
import { useAutoSync } from "@/hooks/useAutoSync";
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
  const { autoSyncEnabled, setAutoSyncEnabled } = useAutoSync();

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
          <DropdownMenuContent align="end" className="w-56 border-border bg-background p-1">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 text-xs font-semibold text-muted-foreground">
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
            <DropdownMenuSeparator className="bg-muted" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 text-xs font-semibold text-muted-foreground">
                Account
              </DropdownMenuLabel>
              {canAddPasskey && (
                <>
                  <DropdownMenuItem
                    onClick={handleAddPasskey}
                    className="cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
                  >
                    <FingerprintIcon className="h-4 w-4" />
                    Add Passkey
                  </DropdownMenuItem>
                </>
              )}

              {passkeyEnabled && (
                <DropdownMenuItem
                  onClick={handleRemovePasskey}
                  className="cursor-pointer text-yellow-400 hover:bg-muted hover:text-yellow-300 focus:bg-muted focus:text-yellow-300"
                >
                  <FingerprintIcon className="h-4 w-4" />
                  Remove Passkey
                </DropdownMenuItem>
              )}

              {isConnected && (
                <DropdownMenuItem
                  onClick={handleDisconnectWallet}
                  className="cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
                >
                  <WalletIcon className="h-4 w-4" />
                  Disconnect Wallet
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-400 hover:bg-muted hover:text-red-300 focus:bg-muted focus:text-red-300"
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
