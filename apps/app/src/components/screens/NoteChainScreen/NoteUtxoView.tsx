/**
 * Note UTXO View Component
 */

import type { NoteOrIntent, NoteNode } from "@shinobi-cash/core/discovery";
import {
  isDepositNote,
  isCrosschainDepositNote,
  isChangeNote,
  isWithdrawalRefundedNote,
  isDepositIntent,
  isWithdrawalIntent,
  isMergedNote,
  isRagequitNote,
  isDepositRefundedNote,
  isWithdrawalNote,
  isCrosschainWithdrawalNote,
  isSpendableNote,
  isNote,
} from "@shinobi-cash/core/discovery";
import { ArrowRight } from "lucide-react";
import { Section, Row } from "@/components/shared/Section";
import { CopyableText } from "@/components/shared/CopyableText";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { ExplorerLink } from "@/components/shared/ExplorerLink";
import { formatEthAmount } from "@/utils/formatters";
import { getChainName } from "@/config/chains";

interface NoteUtxoViewProps {
  note: NoteOrIntent;
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
 * Helper to get serial number from a NoteOrIntent (only notes have serials)
 */
function getSerialNumber(item: NoteOrIntent): string | undefined {
  return isNote(item) ? item.serialNumber : undefined;
}

/**
 * INPUTS Section - Shows where this note came from
 */
function InputsSection({
  note,
  node,
  onNavigate,
}: {
  note: NoteOrIntent;
  node: NoteNode;
  onNavigate: (serial: string) => void;
}) {
  // DepositNote - deposited from wallet
  if (isNote(note) && isDepositNote(note)) {
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
        <Row label="Chain" value={<ExplorerLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
      </Section>
    );
  }

  // CrosschainDepositNote - cross-chain deposit
  if (isNote(note) && isCrosschainDepositNote(note)) {
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
        <Row label="Escrowed" value={<ExplorerLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
        <Row label="Filled" value={<ExplorerLink chainId={note.destinationChainId} txHash={note.destinationTransactionHash} />} />
      </Section>
    );
  }

  // ChangeNote - from withdrawal
  if (isNote(note) && isChangeNote(note)) {
    const parentNote = node.parent?.note;
    const parentSerial = parentNote && isNote(parentNote) ? parentNote.serialNumber : undefined;
    const parentAmount = parentNote && isNote(parentNote) && isSpendableNote(parentNote) ? parentNote.amount : undefined;
    const mergedEntries = Object.entries(note.mergedFrom);

    return (
      <Section title="Inputs">
        <Row label="Source" value={mergedEntries.length > 0 ? "Created from Withdraw2 merge" : "Created from withdrawal"} />
        {parentSerial && (
          <Row
            label="From"
            value={
              <NoteLink
                serialNumber={parentSerial}
                label={parentAmount ? `${parentSerial} (${formatEthAmount(parentAmount, { maxDecimals: 6 })} ETH)` : parentSerial}
                onClick={() => onNavigate(parentSerial)}
              />
            }
          />
        )}
        {mergedEntries.map(([serial, amount]) => (
          <Row
            key={serial}
            label="Merged"
            value={
              <NoteLink
                serialNumber={serial}
                label={`${serial} (${formatEthAmount(amount, { maxDecimals: 6 })} ETH)`}
                onClick={() => onNavigate(serial)}
              />
            }
          />
        ))}
      </Section>
    );
  }

  // WithdrawalRefundedNote - refund from failed withdrawal
  if (isNote(note) && isWithdrawalRefundedNote(note)) {
    // Parent is WithdrawalIntent which doesn't have serialNumber - show orderId instead
    const parentItem = node.parent?.note;
    const parentLabel = parentItem && isWithdrawalIntent(parentItem) ? `Order ${parentItem.orderId.slice(0, 6)}...${parentItem.orderId.slice(-4)}` : undefined;
    return (
      <Section title="Inputs">
        <Row label="Source" value="Refund from failed cross-chain withdrawal" />
        {parentLabel && (
          <Row label="Intent" value={<span className="font-mono text-xs text-neutral-400">{parentLabel}</span>} />
        )}
        <Row label="Refunded" value={<ExplorerLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
      </Section>
    );
  }

  // DepositIntent - pending cross-chain deposit
  if (isDepositIntent(note)) {
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
        <Row label="Escrowed" value={<ExplorerLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
      </Section>
    );
  }

  // WithdrawalIntent - pending cross-chain withdrawal
  if (isWithdrawalIntent(note)) {
    const parentSerial = node.parent ? getSerialNumber(node.parent.note) : undefined;
    return (
      <Section title="Inputs">
        <Row label="Source" value="Crosschain withdrawal" />
        {parentSerial && (
          <Row
            label="From"
            value={<NoteLink serialNumber={parentSerial} onClick={() => onNavigate(parentSerial)} />}
          />
        )}
        <Row label="Escrowed" value={<ExplorerLink chainId={note.originChainId} txHash={note.originTransactionHash} />} />
      </Section>
    );
  }

  // MergedNote - from Withdraw2 loser
  if (isNote(note) && isMergedNote(note)) {
    const parentSerial = node.parent ? getSerialNumber(node.parent.note) : undefined;
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
  if (isNote(note) && isRagequitNote(note)) {
    const parentSerial = node.parent ? getSerialNumber(node.parent.note) : undefined;
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
  if (isNote(note) && isDepositRefundedNote(note)) {
    // Parent is DepositIntent which doesn't have serialNumber - show orderId instead
    const parentItem = node.parent?.note;
    const parentLabel = parentItem && isDepositIntent(parentItem) ? `Order ${parentItem.orderId.slice(0, 6)}...${parentItem.orderId.slice(-4)}` : undefined;
    return (
      <Section title="Inputs">
        <Row label="Source" value="Refund from expired deposit" />
        {parentLabel && (
          <Row label="Intent" value={<span className="font-mono text-xs text-neutral-400">{parentLabel}</span>} />
        )}
      </Section>
    );
  }

  // WithdrawalNote / CrosschainWithdrawalNote - terminal withdrawal records
  if (isNote(note) && (isWithdrawalNote(note) || isCrosschainWithdrawalNote(note))) {
    const parentSerial = node.parent ? getSerialNumber(node.parent.note) : undefined;
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
function ThisNoteSection({ note, node }: { note: NoteOrIntent; node: NoteNode }) {
  // Spendable notes (DepositNote, CrosschainDepositNote, ChangeNote, WithdrawalRefundedNote)
  if (isNote(note) && isSpendableNote(note)) {
    // Determine combined status text
    const getStatusText = () => {
      if (note.status === "spent") return { text: "Spent", color: "text-neutral-400" };
      if (note.aspStatus === "pending") return { text: "Awaiting ASP approval", color: "text-amber-400 italic" };
      return { text: "Approved", color: "text-emerald-400" };
    };
    const status = getStatusText();

    // "Balance" for spendable notes, "Amount Spent" for spent notes
    const amountLabel = note.status === "spent" ? "Amount Spent" : "Balance";

    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row
          label={amountLabel}
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

  // DepositIntent
  if (isDepositIntent(note)) {
    const hasChildren = node.children.length > 0;
    return (
      <Section title="This Intent">
        <Row label="Order" value={<CopyableText text={note.orderId} displayText={`${note.orderId.slice(0, 6)}...${note.orderId.slice(-4)}`} className="text-xs" />} />
        <Row label="Escrowed Amount" value={<AmountDisplay amount={note.amount} layout="inline" ethOptions={{ maxDecimals: 6 }} />} />
        <Row
          label="Status"
          value={
            <span className={hasChildren ? "text-neutral-400" : "text-amber-400 italic"}>
              {hasChildren ? "Resolved" : "Awaiting solver fill"}
            </span>
          }
        />
        <Row label="Destination" value={getChainName(note.destinationChainId)} />
      </Section>
    );
  }

  // WithdrawalIntent
  if (isWithdrawalIntent(note)) {
    const hasChildren = node.children.length > 0;
    return (
      <Section title="This Intent">
        <Row label="Order" value={<CopyableText text={note.orderId} displayText={`${note.orderId.slice(0, 6)}...${note.orderId.slice(-4)}`} className="text-xs" />} />
        <Row label="Amount" value={`${formatEthAmount(note.amount, { maxDecimals: 6 })} ETH`} />
        <Row
          label="Status"
          value={
            <span className={hasChildren ? "text-neutral-400" : "text-amber-400 italic"}>
              {hasChildren ? "Resolved" : "Awaiting solver fill"}
            </span>
          }
        />
        <Row label="Destination" value={getChainName(note.destinationChainId)} />
      </Section>
    );
  }

  // MergedNote
  if (isNote(note) && isMergedNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Contributed" value={`${formatEthAmount(note.contributedAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="Status" value={<span className="text-violet-400">Merged (terminal)</span>} />
      </Section>
    );
  }

  // RagequitNote
  if (isNote(note) && isRagequitNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Withdrawn" value={`${formatEthAmount(note.ragequitAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="To" value={<CopyableText text={note.recipient} className="text-xs" />} />
        <Row label="Status" value={<span className="text-orange-400">Ragequit (terminal)</span>} />
      </Section>
    );
  }

  // DepositRefundedNote
  if (isNote(note) && isDepositRefundedNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Refunded" value={`${formatEthAmount(note.refundedAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="Status" value={<span className="text-orange-400">Refunded (terminal)</span>} />
      </Section>
    );
  }

  // WithdrawalNote
  if (isNote(note) && isWithdrawalNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Withdrawn" value={`${formatEthAmount(note.withdrawnAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="To" value={<CopyableText text={note.recipient} className="text-xs" />} />
        <Row label="Status" value={<span className="text-neutral-400">Withdrawal record</span>} />
      </Section>
    );
  }

  // CrosschainWithdrawalNote
  if (isNote(note) && isCrosschainWithdrawalNote(note)) {
    return (
      <Section title="This Note">
        <Row label="Serial" value={<span className="font-mono">{note.serialNumber}</span>} />
        <Row label="Withdrawn" value={`${formatEthAmount(note.withdrawnAmount, { maxDecimals: 6 })} ETH`} />
        <Row label="To" value={<CopyableText text={note.recipient} className="text-xs" />} />
        <Row label="Delivered" value={<ExplorerLink chainId={note.destinationChainId} txHash={note.destinationTransactionHash} />} />
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
  note: NoteOrIntent;
  node: NoteNode;
  onNavigate: (serial: string) => void;
}) {
  // Spendable notes - show if spent or available
  if (isNote(note) && isSpendableNote(note)) {
    // Unspent with no children - status already shown in "This Note" section
    if (note.status === "unspent" && node.children.length === 0) {
      return null;
    }

    // Find child notes to show
    const changeChild = node.children.find((c) => isNote(c.note) && isChangeNote(c.note));
    const withdrawalChild = node.children.find(
      (c) => isNote(c.note) && (isWithdrawalNote(c.note) || isCrosschainWithdrawalNote(c.note))
    );
    const intentChild = node.children.find((c) => isWithdrawalIntent(c.note));
    const ragequitChild = node.children.find((c) => isNote(c.note) && isRagequitNote(c.note));

    // Extract narrowed note types for JSX
    const withdrawalNote = withdrawalChild && isNote(withdrawalChild.note) &&
      (isWithdrawalNote(withdrawalChild.note) || isCrosschainWithdrawalNote(withdrawalChild.note))
      ? withdrawalChild.note : null;
    const changeNote = changeChild && isNote(changeChild.note) ? changeChild.note : null;
    const ragequitNote = ragequitChild && isNote(ragequitChild.note) ? ragequitChild.note : null;
    const intentNote = intentChild && isWithdrawalIntent(intentChild.note) ? intentChild.note : null;

    return (
      <Section title="Outputs">
        {withdrawalNote && (
          <Row
            label="Withdrew"
            value={`${formatEthAmount(withdrawalNote.withdrawnAmount, { maxDecimals: 6 })} ETH to ${withdrawalNote.recipient.slice(0, 8)}...`}
          />
        )}
        {intentNote && (
          <Row
            label="Order"
            value={
              <span className="font-mono text-xs text-amber-400">
                {intentNote.orderId.slice(0, 6)}...{intentNote.orderId.slice(-4)} ({formatEthAmount(intentNote.amount, { maxDecimals: 6 })} ETH)
              </span>
            }
          />
        )}
        {changeNote && isSpendableNote(changeNote) && (
          <Row
            label="Change"
            value={
              <NoteLink
                serialNumber={changeNote.serialNumber}
                label={`${changeNote.serialNumber} (${formatEthAmount(changeNote.amount, { maxDecimals: 6 })} ETH)`}
                onClick={() => onNavigate(changeNote.serialNumber)}
              />
            }
          />
        )}
        {ragequitNote && (
          <Row
            label="Ragequit"
            value={
              <NoteLink
                serialNumber={ragequitNote.serialNumber}
                onClick={() => onNavigate(ragequitNote.serialNumber)}
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

  // DepositIntent - show outcome
  if (isDepositIntent(note)) {
    const filledChildNode = node.children.find((c) => isNote(c.note) && isCrosschainDepositNote(c.note));
    const refundedChildNode = node.children.find((c) => isNote(c.note) && isDepositRefundedNote(c.note));
    const filledNote = filledChildNode && isNote(filledChildNode.note) ? filledChildNode.note : null;
    const refundedNote = refundedChildNode && isNote(refundedChildNode.note) ? refundedChildNode.note : null;

    if (filledNote) {
      return (
        <Section title="Outcome">
          <Row
            label="Filled"
            value={
              <NoteLink
                serialNumber={filledNote.serialNumber}
                onClick={() => onNavigate(filledNote.serialNumber)}
              />
            }
          />
        </Section>
      );
    }

    if (refundedNote) {
      return (
        <Section title="Outcome">
          <Row
            label="Refunded"
            value={
              <NoteLink
                serialNumber={refundedNote.serialNumber}
                onClick={() => onNavigate(refundedNote.serialNumber)}
              />
            }
          />
        </Section>
      );
    }

    // Pending - status already shown in "This Intent" section
    return null;
  }

  // WithdrawalIntent - show outcome
  if (isWithdrawalIntent(note)) {
    const filledChildNode = node.children.find((c) => isNote(c.note) && isCrosschainWithdrawalNote(c.note));
    const refundedChildNode = node.children.find((c) => isNote(c.note) && isWithdrawalRefundedNote(c.note));
    // Change note is sibling, not child
    const changeSiblingNode = node.parent?.children.find(
      (c) => c !== node && isNote(c.note) && isChangeNote(c.note)
    );

    // Extract narrowed types
    const filledNote = filledChildNode && isNote(filledChildNode.note) && isCrosschainWithdrawalNote(filledChildNode.note)
      ? filledChildNode.note : null;
    const changeNote = changeSiblingNode && isNote(changeSiblingNode.note) ? changeSiblingNode.note : null;
    const refundedNote = refundedChildNode && isNote(refundedChildNode.note) ? refundedChildNode.note : null;

    if (filledNote) {
      return (
        <Section title="Outcome">
          <Row
            label="Delivered"
            value={<ExplorerLink chainId={filledNote.destinationChainId} txHash={filledNote.destinationTransactionHash} />}
          />
          {changeNote && (
            <Row
              label="Change"
              value={
                <NoteLink
                  serialNumber={changeNote.serialNumber}
                  onClick={() => onNavigate(changeNote.serialNumber)}
                />
              }
            />
          )}
        </Section>
      );
    }

    if (refundedNote) {
      return (
        <Section title="Outcome">
          <Row
            label="Refunded"
            value={
              <NoteLink
                serialNumber={refundedNote.serialNumber}
                onClick={() => onNavigate(refundedNote.serialNumber)}
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
  if (isNote(note) && isMergedNote(note)) {
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
  if (isNote(note) && (isRagequitNote(note) || isDepositRefundedNote(note))) {
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
      <ThisNoteSection note={note} node={node} />
      <InputsSection note={note} node={node} onNavigate={onNavigate} />
      <OutputsSection note={note} node={node} onNavigate={onNavigate} />
    </div>
  );
}
