'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

const TOKENS: Record<string, `0x${string}`> = {
  pathUSD: '0x20c0000000000000000000000000000000000000',
  AlphaUSD: '0x20c0000000000000000000000000000000000001',
  BetaUSD: '0x20c0000000000000000000000000000000000002',
  ThetaUSD: '0x20c0000000000000000000000000000000000003',
};

const DECIMALS = 6;

// ←←← ЗАМЕНИ НА АДРЕС СВОЕГО РАЗВЕРНУТОГО КОНТРАКТА ←←←
const LOCK_CONTRACT = '0xade936F9aCe4d659226326860233BDEB5A946DEA' as `0x${string}`;

const LOCK_ABI = [
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'daysToLock', type: 'uint256' },
    ],
    name: 'lockTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'lockId', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getMyLocks',
    outputs: [
      {
        components: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'unlockTime', type: 'uint256' },
          { name: 'withdrawn', type: 'bool' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export default function Home() {
  const { address, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState<keyof typeof TOKENS>('AlphaUSD');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');

  const { writeContract, data: hash, isPending: isTxPending } = useWriteContract();

  const { data: locks, refetch: refetchLocks } = useReadContract({
    address: LOCK_CONTRACT,
    abi: LOCK_ABI,
    functionName: 'getMyLocks',
    account: address,
  });

  const { data: allowance } = useReadContract({
    address: TOKENS[selectedToken],
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, LOCK_CONTRACT] : undefined,
  });

  const parsedAmount = amount ? parseUnits(amount, DECIMALS) : BigInt(0);
  const needsApprove = allowance ? allowance < parsedAmount : true;

  const handleApprove = () => {
    writeContract({
      address: TOKENS[selectedToken],
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [LOCK_CONTRACT, parsedAmount],
    });
  };

  const handleLock = () => {
    if (!amount || !days) return;
    writeContract({
      address: LOCK_CONTRACT,
      abi: LOCK_ABI,
      functionName: 'lockTokens',
      args: [TOKENS[selectedToken], parsedAmount, BigInt(days)],
    });
  };

  // Обновляем список блокировок после успешной транзакции
  useWaitForTransactionReceipt({
    hash,
    onSuccess: () => refetchLocks(),
  });

  return (
    <div className="max-w-3xl mx-auto p-6 mt-10">
      <h1 className="text-4xl font-bold text-center mb-10">Tempo Testnet Token Locker</h1>

      <div className="flex justify-center mb-8">
        <ConnectButton />
      </div>

      {!isConnected ? (
        <p className="text-center text-gray-600">Подключи кошелёк, чтобы начать</p>
      ) : (
        <>
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 mb-8">
            <p className="font-semibold mb-2">How to get test tokens?:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Go to <a href="https://docs.tempo.xyz/quickstart/faucet" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">official faucet</a></li>
              <li>Or run in the terminal:</li>
            </ul>
            <code className="block bg-gray-900 text-white text-xs p-3 rounded mt-2">
              npx cast rpc tempo_fundAddress {address} --rpc-url https://rpc.testnet.tempo.xyz
            </code>
            <p className="text-sm mt-2">You will receive 1,000,000 of each token.</p>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-8 space-y-6">
            <div>
              <label className="block font-medium mb-2">Token for blocking</label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value as keyof typeof TOKENS)}
                className="w-full border rounded-lg px-4 py-2"
              >
                {Object.keys(TOKENS).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">Quantity</label>
              <input
                type="number"
                placeholder="For example: 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Days of blocking</label>
              <input
                type="number"
                placeholder="For example: 5"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>

            {needsApprove && (
              <button
                onClick={handleApprove}
                disabled={isTxPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50"
              >
                {isTxPending ? 'Approve в процессе...' : 'Approve token'}
              </button>
            )}

            <button
              onClick={handleLock}
              disabled={isTxPending || !amount || !days || needsApprove}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-lg disabled:opacity-50"
            >
              {isTxPending ? 'Blocking tokens...' : 'Locked token'}
            </button>
          </div>

          <h2 className="text-2xl font-bold mt-12 mb-6">My blocks</h2>

          {locks && locks.length > 0 ? (
            <div className="space-y-4">
              {locks.map((lock: any, i: number) => {
                const tokenName = Object.entries(TOKENS).find(([_, addr]) => addr.toLowerCase() === lock.token.toLowerCase())?.[0] || lock.token;
                const now = Math.floor(Date.now() / 1000);
                const canWithdraw = now >= Number(lock.unlockTime);
                const daysLeft = Math.max(0, Math.ceil((Number(lock.unlockTime) - now) / 86400));

                return (
                  <div key={i} className="bg-gray-50 border rounded-lg p-6">
                    <p><strong>Token:</strong> {tokenName}</p>
                    <p><strong>Quantity:</strong> {formatUnits(lock.amount, DECIMALS)}</p>
                    <p>
                      <strong>Unlock:</strong>{' '}
                      {canWithdraw
                        ? <span className="text-green-600 font-bold">Available now!</span>
                        : `Through ${daysLeft} ${daysLeft === 1 ? 'day' : daysLeft < 5 ? 'days' : 'days'}`
                      }
                    </p>
                    {lock.withdrawn ? (
                      <p className="text-green-600 font-bold">✓ Withdrawn</p>
                    ) : (
                      <button
                        disabled={!canWithdraw || isTxPending}
                        onClick={() => writeContract({
                          address: LOCK_CONTRACT,
                          abi: LOCK_ABI,
                          functionName: 'withdraw',
                          args: [BigInt(i)],
                        })}
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
                      >
                        Withdraw tokens
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500">No active locks</p>
          )}
        </>
      )}
    </div>
  );
}
