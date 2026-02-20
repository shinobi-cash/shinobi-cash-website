/**
 * Section components for Activity Details Screen
 */

import React from "react";
import type { Note } from "@shinobi-cash/core/discovery";
import type { ActivityTimelineEvent } from "@/types/activity";
import { Section, Row } from "@/components/shared/Section";
import { CopyableText } from "@/components/shared/CopyableText";
import { ExplorerLink } from "@/components/shared/ExplorerLink";
import { formatTimestamp } from "@/utils/formatters";
import { SerialLink, AmountValue } from "./components";
import type { InputNote } from "./types";

// ============================================
// Deposit Sections
// ============================================

interface DepositDetailsSectionProps {
  user: string | null;
  createdNote: Note | null;
  netAmount: bigint;
  onViewNoteChain?: (note: Note) => void;
}

export function DepositDetailsSection({
  user,
  createdNote,
  netAmount,
  onViewNoteChain,
}: DepositDetailsSectionProps) {
  return (
    <Section title="Deposit Details">
      {user && <Row label="Depositor" value={<CopyableText text={user} />} />}
      <Row
        label="Note Created"
        value={
          createdNote ? (
            <SerialLink
              serial={createdNote.serialNumber}
              note={createdNote}
              onViewNoteChain={onViewNoteChain}
            />
          ) : (
            <span className="text-neutral-400">Pending</span>
          )
        }
      />
      <Row
        label="Amount"
        value={
          <AmountValue
            amount={createdNote?.amount ?? netAmount.toString()}
            type="positive"
          />
        }
      />
    </Section>
  );
}

// ============================================
// Withdrawal Sections
// ============================================

interface WithdrawalInputSectionProps {
  inputNotes: InputNote[];
  fallbackAmount: bigint | null;
  isMergedWithdrawal: boolean;
  onViewNoteChain?: (note: Note) => void;
}

export function WithdrawalInputSection({
  inputNotes,
  fallbackAmount,
  isMergedWithdrawal,
  onViewNoteChain,
}: WithdrawalInputSectionProps) {
  return (
    <Section title={isMergedWithdrawal ? "Inputs" : "Input"}>
      {inputNotes.length > 0 ? (
        inputNotes.map((input, index) => {
          const noteNum = index + 1;
          return (
            <React.Fragment key={input.serialNumber}>
              <Row
                label={`Note ${noteNum}`}
                value={
                  input.note ? (
                    <SerialLink
                      serial={input.serialNumber}
                      note={input.note}
                      onViewNoteChain={onViewNoteChain}
                    />
                  ) : (
                    <span className="font-mono text-sm text-white">
                      {input.serialNumber}
                    </span>
                  )
                }
              />
              <Row
                label={`Note ${noteNum} Amount`}
                value={<AmountValue amount={input.amount} type="negative" />}
              />
            </React.Fragment>
          );
        })
      ) : (
        <>
          <Row
            label="Note 1"
            value={<span className="text-neutral-400">Unknown</span>}
          />
          <Row
            label="Note 1 Amount"
            value={
              <AmountValue
                amount={fallbackAmount?.toString() ?? "0"}
                type="negative"
              />
            }
          />
        </>
      )}
    </Section>
  );
}

interface WithdrawalFeesSectionProps {
  relayFee: bigint;
  solverFee: bigint;
}

export function WithdrawalFeesSection({
  relayFee,
  solverFee,
}: WithdrawalFeesSectionProps) {
  const hasRelayFee = relayFee > BigInt(0);
  const hasSolverFee = solverFee > BigInt(0);

  if (!hasRelayFee && !hasSolverFee) return null;

  return (
    <Section title="Fees">
      {hasRelayFee && (
        <Row
          label="Relay Fee"
          value={<AmountValue amount={relayFee} type="fee" />}
        />
      )}
      {hasSolverFee && (
        <Row
          label="Solver Fee"
          value={<AmountValue amount={solverFee} type="fee" />}
        />
      )}
    </Section>
  );
}

interface WithdrawalOutputSectionProps {
  recipient: string | null;
  netAmount: bigint;
  changeNote: Note | null;
  newCommitment: string | null;
  onViewNoteChain?: (note: Note) => void;
}

export function WithdrawalOutputSection({
  recipient,
  netAmount,
  changeNote,
  newCommitment,
  onViewNoteChain,
}: WithdrawalOutputSectionProps) {
  if (!recipient && !changeNote && !newCommitment) return null;

  return (
    <Section title="Output">
      {recipient && (
        <>
          <Row label="Recipient" value={<CopyableText text={recipient} />} />
          <Row
            label="Recipient Amount"
            value={
              <span className="font-medium">
                <AmountValue amount={netAmount} type="positive" />
              </span>
            }
          />
        </>
      )}
      {changeNote && (
        <>
          <Row
            label="Change Note"
            value={
              <SerialLink
                serial={changeNote.serialNumber}
                note={changeNote}
                onViewNoteChain={onViewNoteChain}
              />
            }
          />
          <Row
            label="Change Amount"
            value={<AmountValue amount={changeNote.amount} type="positive" />}
          />
        </>
      )}
      {newCommitment && !changeNote && (
        <Row label="Change Note" value="Created" />
      )}
    </Section>
  );
}

// ============================================
// Transaction Section
// ============================================

interface TransactionSectionProps {
  chainId: string | number;
  txHash: string;
  timestamp: string;
}

export function TransactionSection({
  chainId,
  txHash,
  timestamp,
}: TransactionSectionProps) {
  return (
    <Section title="Transaction">
      <Row label="Time" value={formatTimestamp(timestamp)} />
      <Row label="Chain" value={<ExplorerLink chainId={chainId} txHash={txHash} />} />
    </Section>
  );
}

// ============================================
// Crosschain Section
// ============================================

interface CrosschainSectionProps {
  orderId: string;
  timeline?: ActivityTimelineEvent[];
}

export function CrosschainSection({ orderId, timeline }: CrosschainSectionProps) {
  const intentEvent = timeline?.find((e) => e.activity.type.includes("INTENT"));
  const fillEvent = timeline?.find((e) => e.activity.type.includes("FILL"));
  const refundEvent = timeline?.find((e) => e.activity.type.includes("REFUND"));

  return (
    <Section title="Crosschain">
      <Row label="Order ID" value={<CopyableText text={orderId} />} />
      {intentEvent && (
        <Row
          label="Order Created"
          value={
            <ExplorerLink
              chainId={intentEvent.activity.chainId}
              txHash={intentEvent.activity.txHash}
            />
          }
        />
      )}
      {fillEvent ? (
        <Row
          label="Order Filled"
          value={
            <ExplorerLink
              chainId={fillEvent.activity.chainId}
              txHash={fillEvent.activity.txHash}
            />
          }
        />
      ) : refundEvent ? (
        <Row
          label="Order Refunded"
          value={
            <ExplorerLink
              chainId={refundEvent.activity.chainId}
              txHash={refundEvent.activity.txHash}
            />
          }
        />
      ) : (
        <Row
          label="Order Filled"
          value={<span className="text-yellow-400">Pending</span>}
        />
      )}
    </Section>
  );
}

// ============================================
// Cryptographic Section
// ============================================

interface CryptographicSectionProps {
  commitment?: string | null;
  precommitment?: string | null;
  label?: string | null;
  newCommitment?: string | null;
  refundCommitment?: string | null;
}

export function CryptographicSection({
  commitment,
  precommitment,
  label,
  newCommitment,
  refundCommitment,
}: CryptographicSectionProps) {
  return (
    <Section title="Cryptographic">
      {commitment && (
        <Row
          label="Commitment"
          value={<CopyableText text={commitment} truncateStart={10} truncateEnd={8} />}
        />
      )}
      {precommitment && (
        <Row
          label="Precommitment"
          value={<CopyableText text={precommitment} truncateStart={10} truncateEnd={8} />}
        />
      )}
      {label && (
        <Row
          label="Label"
          value={<CopyableText text={label} truncateStart={10} truncateEnd={8} />}
        />
      )}
      {newCommitment && (
        <Row
          label="Change Commitment"
          value={<CopyableText text={newCommitment} truncateStart={10} truncateEnd={8} />}
        />
      )}
      {refundCommitment && (
        <Row
          label="Refund Commitment"
          value={<CopyableText text={refundCommitment} truncateStart={10} truncateEnd={8} />}
        />
      )}
    </Section>
  );
}
