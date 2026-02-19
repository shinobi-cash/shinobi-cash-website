/**
 * Note UTXO View Component
 * Displays a single note in UTXO style with INPUTS → THIS NOTE → OUTPUTS sections
 */

import type { Note, NoteNode } from "@shinobi-cash/core/discovery";
import {
  isDepositNote,
  isCrosschainDepositNote,
  isChangeNote,
  isWithdrawalRefundedNote,
  isDepositIntentNote,
  isWithdrawalIntentNote,
  isMergedNote,
  isRagequitNote,
  isDepositRefundedNote,
  isWithdrawalNote,
  isCrosschainWithdrawalNote,
  isSpendableNote,
} from "@shinobi-cash/core/discovery";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Section, Row } from "@/components/shared/Section";
import { CopyableText } from "@/components/shared/CopyableText";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { formatEthAmount } from "@/utils/formatters";
import { getTxExplorerUrl, getChainName } from "@/config/chains";

interface NoteUtxoViewProps {
  note: Note;
  node: NoteNode;
  onNavigate: (serialNumber: string) => void;
}

/**
 * Clickable link to navigate to another note
 */
function NoteLink({
  serialNumber,
  label,
  onClick,
}: {
  serialNumber: string;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
    >
      {label || serialNumber}
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}

/**
 * External link to block explorer
 */
function TxLink({ chainId, txHash }: { chainId: string; txHash: string }) {
  const url = getTxExplorerUrl(chainId, txHash);
  const chainName = getChainName(chainId);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
    >
      {chainName}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

/**
 * INPUTS Section - Shows where this note came from
 */
function InputsSection({
  note,
  node,
  onNavigate,
}: {
  note: Note;
  node: NoteNode;
  onNavigate: (serial: string) => void;
}) {
  // DepositNote - deposited from wallet
  if (isDepositNote(note)) {
    const userAddress = note.activityData.user;
    return (
      <Section title="Inputs">
        <Row
          label="Source"
          value={
            userAddress ? (
              <CopyableText text={userAddress} />
            ) : (
              "Wallet"
            )
          }
        />
        <Row label="Chain" value={<TxLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
      </Section>
    );
  }

  // CrosschainDepositNote - cross-chain deposit
  if (isCrosschainDepositNote(note)) {
    return (
      <Section title="Inputs">
        <Row label="Source" value="Cross-chain deposit" />
        <Row label="Escrowed" value={<TxLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
        <Row label="Filled" value={<TxLink chainId={note.destinationChainId} txHash={note.destinationTransactionHash} />} />
      </Section>
    );
  }

  // ChangeNote - from withdrawal
  if (isChangeNote(note)) {
    const parentSerial = node.parent?.note.serialNumber;
    const mergedSerials = Object.keys(note.mergedFrom);

    return (
      <Section title="Inputs">
        <Row label="Source" value="Created from withdrawal" />
        {parentSerial && (
          <Row
            label="From"
            value={<NoteLink serialNumber={parentSerial} onClick={() => onNavigate(parentSerial)} />}
          />
        )}
        {mergedSerials.length > 0 && (
          <Row
            label="Merged"
            value={
              <NoteLink
                serialNumber={mergedSerials[0]}
                onClick={() => onNavigate(mergedSerials[0])}
              />
            }
          />
        )}
      </Section>
    );
  }

  // WithdrawalRefundedNote - refund from failed withdrawal
  if (isWithdrawalRefundedNote(note)) {
    const parentSerial = node.parent?.note.serialNumber;
    return (
      <Section title="Inputs">
        <Row label="Source" value="Refund from failed cross-chain withdrawal" />
        {parentSerial && (
          <Row
            label="Intent"
            value={<NoteLink serialNumber={parentSerial} onClick={() => onNavigate(parentSerial)} />}
          />
        )}
        <Row label="Refunded" value={<TxLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
      </Section>
    );
  }

  // DepositIntentNote - pending cross-chain deposit
  if (isDepositIntentNote(note)) {
    return (
      <Section title="Inputs">
        <Row label="Source" value="Cross-chain deposit (pending)" />
        <Row label="Escrowed" value={<TxLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
      </Section>
    );
  }

  // WithdrawalIntentNote - pending cross-chain withdrawal
  if (isWithdrawalIntentNote(note)) {
    const parentSerial = node.parent?.note.serialNumber;
    return (
      <Section title="Inputs">
        <Row label="Source" value="Cross-chain withdrawal (pending)" />
        {parentSerial && (
          <Row
            label="From"
            value={<NoteLink serialNumber={parentSerial} onClick={() => onNavigate(parentSerial)} />}
          />
        )}
        <Row label="Escrowed" value={<TxLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
      </Section>
    );
  }

  // MergedNote - from Withdraw2 loser
  if (isMergedNote(note)) {
    const parentSerial = node.parent?.note.serialNumber;
    return (
      <Section title="Inputs">
        <Row label="Source" value="Merged in Withdraw2" />
        {parentSerial && (
          <Row
            label="From"
            value={<NoteLink serialNumber={parentSerial} onClick={() => onNavigate(parentSerial)} />}
          />
        )}
      </Section>
    );
  }

  // RagequitNote - from ragequit
  if (isRagequitNote(note)) {
    const parentSerial = node.parent?.note.serialNumber;
    return (
      <Section title="Inputs">
        <Row label="Source" value="Public withdrawal (ragequit)" />
        {parentSerial && (
          <Row
            label="From"
            value={<NoteLink serialNumber={parentSerial} onClick={() => onNavigate(parentSerial)} />}
          />
        )}
      </Section>
    );
  }

  // DepositRefundedNote - refund from failed deposit
  if (isDepositRefundedNote(note)) {
    const parentSerial = node.parent?.note.serialNumber;
    return (
      <Section title="Inputs">
        <Row label="Source" value="Refund from expired deposit" />
        {parentSerial && (
          <Row
            label="Intent"
            value={<NoteLink serialNumber={parentSerial} onClick={() => onNavigate(parentSerial)} />}
          />
        )}
      </Section>
    );
  }

  // WithdrawalNote / CrosschainWithdrawalNote - terminal withdrawal records
  if (isWithdrawalNote(note) || isCrosschainWithdrawalNote(note)) {
    const parentSerial = node.parent?.note.serialNumber;
    return (
      <Section title="Inputs">
        <Row label="Source" value="Withdrawal record" />
        {parentSerial && (
          <Row
            label="From"
            value={<NoteLink serialNumber={parentSerial} onClick={() => onNavigate(parentSerial)} />}
          />
        )}
      </Section>
    );
  }

  return null;
}

/**
 * THIS NOTE Section - Shows note details
 */
function ThisNoteSection({ note, node }: { note: Note; node: NoteNode }) {
  // Spendable notes (DepositNote, CrosschainDepositNote, ChangeNote, WithdrawalRefundedNote)
  if (isSpendableNote(note)) {
    // Determine combined status text
    const getStatusText = () => {
      if (note.status === "spent") return { text: "Spent", color: "text-neutral-400" };
      if (note.aspStatus === "pending") return { text: "Awaiting ASP approval", color: "text-amber-400" };
      return { text: "Available", color: "text-emerald-400" };
    };
    const status = getStatusText();

    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row
          label="Balance"
          value={
            <AmountDisplay
              amount={note.amount}
              layout="inline"
              ethOptions={{ maxDecimals: 6 }}
              ethClassName="text-sm font-semibold text-white"
              usdClassName="text-xs text-neutral-400"
            />
          }
        />
        <Row label="Status" value={<span className={status.color}>{status.text}</span>} />
      </Section>
    );
  }

  // DepositIntentNote
  if (isDepositIntentNote(note)) {
    const hasChildren = node.children.length > 0;
    return (
      <Section title="This Intent">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Amount" value={`${formatEthAmount(note.amount, { maxDecimals: 6 })} ETH (escrowed)`} />
        <Row
          label="Status"
          value={
            <span className={hasChildren ? "text-neutral-400" : "text-amber-400"}>
              {hasChildren ? "Resolved" : "Awaiting solver fill"}
            </span>
          }
        />
        <Row label="Destination" value={getChainName(note.destinationChainId)} />
      </Section>
    );
  }

  // WithdrawalIntentNote
  if (isWithdrawalIntentNote(note)) {
    const hasChildren = node.children.length > 0;
    return (
      <Section title="This Intent">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Amount" value={`${formatEthAmount(note.amount, { maxDecimals: 6 })} ETH`} />
        <Row
          label="Status"
          value={
            <span className={hasChildren ? "text-neutral-400" : "text-amber-400"}>
              {hasChildren ? "Resolved" : "Awaiting delivery"}
            </span>
          }
        />
        <Row label="Destination" value={getChainName(note.destinationChainId)} />
      </Section>
    );
  }

  // MergedNote
  if (isMergedNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Contributed" value={`${formatEthAmount(note.contributedAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="Status" value={<span className="text-violet-400">Merged (terminal)</span>} />
      </Section>
    );
  }

  // RagequitNote
  if (isRagequitNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Withdrawn" value={`${formatEthAmount(note.ragequitAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="To" value={<span className="font-mono text-xs">{note.recipient}</span>} />
        <Row label="Status" value={<span className="text-orange-400">Ragequit (terminal)</span>} />
      </Section>
    );
  }

  // DepositRefundedNote
  if (isDepositRefundedNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Refunded" value={`${formatEthAmount(note.refundedAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="Status" value={<span className="text-orange-400">Refunded (terminal)</span>} />
      </Section>
    );
  }

  // WithdrawalNote
  if (isWithdrawalNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Withdrawn" value={`${formatEthAmount(note.withdrawnAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="To" value={<span className="font-mono text-xs">{note.recipient}</span>} />
        <Row label="Status" value={<span className="text-neutral-400">Withdrawal record</span>} />
      </Section>
    );
  }

  // CrosschainWithdrawalNote
  if (isCrosschainWithdrawalNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Withdrawn" value={`${formatEthAmount(note.withdrawnAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="To" value={<span className="font-mono text-xs">{note.recipient}</span>} />
        <Row label="Delivered" value={<TxLink chainId={note.destinationChainId} txHash={note.destinationTransactionHash} />} />
        <Row label="Status" value={<span className="text-neutral-400">Withdrawal record</span>} />
      </Section>
    );
  }

  return null;
}

/**
 * OUTPUTS Section - Shows what happened to this note
 */
function OutputsSection({
  note,
  node,
  onNavigate,
}: {
  note: Note;
  node: NoteNode;
  onNavigate: (serial: string) => void;
}) {
  // Spendable notes - show if spent or available
  if (isSpendableNote(note)) {
    // Unspent with no children - status already shown in "This Note" section
    if (note.status === "unspent" && node.children.length === 0) {
      return null;
    }

    // Find child notes to show
    const changeChild = node.children.find((c) => isChangeNote(c.note));
    const withdrawalChild = node.children.find(
      (c) => isWithdrawalNote(c.note) || isCrosschainWithdrawalNote(c.note)
    );
    const intentChild = node.children.find((c) => isWithdrawalIntentNote(c.note));
    const ragequitChild = node.children.find((c) => isRagequitNote(c.note));

    return (
      <Section title="Outputs">
        {withdrawalChild && isWithdrawalNote(withdrawalChild.note) && (
          <Row
            label="Withdrew"
            value={`${formatEthAmount(withdrawalChild.note.withdrawnAmount, { maxDecimals: 6 })} ETH to ${withdrawalChild.note.recipient.slice(0, 8)}...`}
          />
        )}
        {withdrawalChild && isCrosschainWithdrawalNote(withdrawalChild.note) && (
          <Row
            label="Withdrew"
            value={`${formatEthAmount(withdrawalChild.note.withdrawnAmount, { maxDecimals: 6 })} ETH to ${withdrawalChild.note.recipient.slice(0, 8)}...`}
          />
        )}
        {intentChild && (
          <Row
            label="Pending"
            value={
              <NoteLink
                serialNumber={intentChild.note.serialNumber}
                label="Withdrawal intent"
                onClick={() => onNavigate(intentChild.note.serialNumber)}
              />
            }
          />
        )}
        {changeChild && (
          <Row
            label="Change"
            value={
              <NoteLink
                serialNumber={changeChild.note.serialNumber}
                onClick={() => onNavigate(changeChild.note.serialNumber)}
              />
            }
          />
        )}
        {ragequitChild && (
          <Row
            label="Ragequit"
            value={
              <NoteLink
                serialNumber={ragequitChild.note.serialNumber}
                onClick={() => onNavigate(ragequitChild.note.serialNumber)}
              />
            }
          />
        )}
        {node.children.length === 0 && note.status === "spent" && (
          <Row label="Status" value={<span className="text-neutral-400">Spent (no change)</span>} />
        )}
      </Section>
    );
  }

  // DepositIntentNote - show outcome
  if (isDepositIntentNote(note)) {
    const filledChild = node.children.find((c) => isCrosschainDepositNote(c.note));
    const refundedChild = node.children.find((c) => isDepositRefundedNote(c.note));

    if (filledChild) {
      return (
        <Section title="Outcome">
          <Row
            label="Filled"
            value={
              <NoteLink
                serialNumber={filledChild.note.serialNumber}
                onClick={() => onNavigate(filledChild.note.serialNumber)}
              />
            }
          />
        </Section>
      );
    }

    if (refundedChild) {
      return (
        <Section title="Outcome">
          <Row
            label="Refunded"
            value={
              <NoteLink
                serialNumber={refundedChild.note.serialNumber}
                onClick={() => onNavigate(refundedChild.note.serialNumber)}
              />
            }
          />
        </Section>
      );
    }

    // Pending - status already shown in "This Intent" section
    return null;
  }

  // WithdrawalIntentNote - show outcome
  if (isWithdrawalIntentNote(note)) {
    const filledChild = node.children.find((c) => isCrosschainWithdrawalNote(c.note));
    const refundedChild = node.children.find((c) => isWithdrawalRefundedNote(c.note));
    // Change note is sibling, not child
    const changeSibling = node.parent?.children.find(
      (c) => c !== node && isChangeNote(c.note)
    );

    if (filledChild && isCrosschainWithdrawalNote(filledChild.note)) {
      const filledNote = filledChild.note;
      return (
        <Section title="Outcome">
          <Row
            label="Delivered"
            value={<TxLink chainId={filledNote.destinationChainId} txHash={filledNote.destinationTransactionHash} />}
          />
          {changeSibling && (
            <Row
              label="Change"
              value={
                <NoteLink
                  serialNumber={changeSibling.note.serialNumber}
                  onClick={() => onNavigate(changeSibling.note.serialNumber)}
                />
              }
            />
          )}
        </Section>
      );
    }

    if (refundedChild) {
      return (
        <Section title="Outcome">
          <Row
            label="Refunded"
            value={
              <NoteLink
                serialNumber={refundedChild.note.serialNumber}
                onClick={() => onNavigate(refundedChild.note.serialNumber)}
              />
            }
          />
        </Section>
      );
    }

    // Pending - status already shown in "This Intent" section
    return null;
  }

  // MergedNote - show where it merged into
  if (isMergedNote(note)) {
    return (
      <Section title="Merged Into">
        <Row
          label="Winner"
          value={
            <NoteLink
              serialNumber={note.mergedIntoSerialNumber}
              onClick={() => onNavigate(note.mergedIntoSerialNumber)}
            />
          }
        />
      </Section>
    );
  }

  // Terminal notes don't have outputs
  if (isRagequitNote(note) || isDepositRefundedNote(note)) {
    return (
      <Section title="Outputs">
        <Row label="Status" value={<span className="text-neutral-400">Terminal (no further outputs)</span>} />
      </Section>
    );
  }

  return null;
}

/**
 * Main UTXO View component
 */
export function NoteUtxoView({ note, node, onNavigate }: NoteUtxoViewProps) {
  return (
    <div className="space-y-4">
      <InputsSection note={note} node={node} onNavigate={onNavigate} />
      <ThisNoteSection note={note} node={node} />
      <OutputsSection note={note} node={node} onNavigate={onNavigate} />
    </div>
  );
}
