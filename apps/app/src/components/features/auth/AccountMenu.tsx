/**
 * Account Management Menu
 * Provides logout, disconnect wallet, and add passkey options
 */

import { useAuth } from "@/contexts/AuthContext";
import { storageManager } from "@/lib/storage";
import { isPasskeySupported } from "@/utils/environment";
import { Fingerprint, LogOut, WalletIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

interface AccountMenuProps {
  children: React.ReactNode;
  onAddPasskey?: () => void;
}

export function AccountMenu({ children, onAddPasskey }: AccountMenuProps) {
  const { isAuthenticated, signOut } = useAuth();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [canAddPasskey, setCanAddPasskey] = useState(false);

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

        // Check if account is wallet-based (has wallet address but no passkey)
        const isWalletBased = accountData.isWalletBased || accountData.walletAddress;
        if (!isWalletBased) {
          setCanAddPasskey(false);
          return;
        }

        // Check if passkey already exists for this account
        const hasPasskey = await storageManager.passkeyExists(accountData.accountName);
        setCanAddPasskey(!hasPasskey);
      } catch (error) {
        console.error("Failed to check passkey status:", error);
        setCanAddPasskey(false);
      }
    };

    checkPasskeyStatus();
  }, [isAuthenticated]);

  const handleLogout = useCallback(async () => {
    await signOut();
    // Also disconnect wallet when logging out
    if (isConnected) {
      disconnect();
    }
  }, [signOut, isConnected, disconnect]);

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
      <DropdownMenuContent align="end" className="w-48 border-gray-700 bg-gray-900 p-1">
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
