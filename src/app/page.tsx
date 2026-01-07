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

  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isTxSuccess) {
      refetchLocks();
    }
  }, [isTxSuccess, refetchLocks]);

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
      args: [TOKENS[selectedToken], parsedAmount, BigInt(days || 0)],
    });
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-bold text-center text-white mb-12 tracking-tight">
          Tempo Token Locker
        </h1>

        <div className="flex justify-center mb-12">
          <ConnectButton />
        </div>

        {!isConnected ? (
          <p className="text-center text-gray-400 text-lg">
            Connect your wallet, to start
          </p>
        ) : (
          <>
            {/* Faucet instructions */}
            <div className="bg-gray-900 border border-purple-800 rounded-2xl p-8 mb-10 shadow-2xl">
              <p className="font-bold text-purple-400 text-xl mb-4">
                How to get test tokens?
              </p>
              <ul className="text-gray-300 space-y-2">
                <li>• Go to <a href="https://docs.tempo.xyz/quickstart/faucet" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline hover:text-purple-300">official faucet</a></li>
                <li>• Or in the terminal:</li>
              </ul>
              <code className="block bg-black text-purple-300 text-sm p-4 rounded-lg mt-4 overflow-x-auto">
                npx cast rpc tempo_fundAddress {address?.slice(0, 6)}...{address?.slice(-4)} --rpc-url https://rpc.testnet.tempo.xyz
              </code>
              <p className="text-gray-400 text-sm mt-4">You will receive 1,000,000 of each token.</p>
            </div>

            {/* Blocking form */}
            <div className="bg-gray-900 rounded-2xl p-10 shadow-2xl border border-gray-800">
              <div className="space-y-8">
                <div>
                  <label className="block text-gray-300 font-medium mb-3">Token for blocking</label>
                  <select
                    value={selectedToken}
                    onChange={(e) => setSelectedToken(e.target.value as keyof typeof TOKENS)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-purple-500 transition"
                  >
                    {Object.keys(TOKENS).map((name) => (
                      <option key={name} value={name} className="bg-gray-800">{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-3">Quantity</label>
                  <input
                    type="number"
                    placeholder="For example: 500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-3">Days of blocking</label>
                  <input
                    type="number"
                    placeholder="For example: 30"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-6 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                {needsApprove && (
                  <button
                    onClick={handleApprove}
                    disabled={isTxPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-5 rounded-xl disabled:opacity-60 transition shadow-lg"
                  >
                    {isTxPending ? 'Approve in progress...' : 'Approve token'}
                  </button>
                )}

                <button
                  onClick={handleLock}
                  disabled={isTxPending || !amount || !days || needsApprove}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 rounded-xl disabled:opacity-60 transition shadow-2xl text-xl"
                >
                  {isTxPending ? 'Blocking tokens...' : 'Lock tokens'}
                </button>
              </div>
            </div>

            {/* Block list */}
            <h2 className="text-3xl font-bold text-white mt-16 mb-8 text-center">My blocks</h2>

            {locks && locks.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {locks.map((lock: any, i: number) => {
                  const tokenName = Object.entries(TOKENS).find(([_, addr]) => addr.toLowerCase() === lock.token.toLowerCase())?.[0] || lock.token;
                  const now = Math.floor(Date.now() / 1000);
                  const canWithdraw = now >= Number(lock.unlockTime);
                  const daysLeft = Math.max(0, Math.ceil((Number(lock.unlockTime) - now) / 86400));

                  return (
                    <div key={i} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl hover:border-purple-700 transition">
                      <div className="space-y-4">
                        <p className="text-gray-300"><strong>Token:</strong> <span className="text-purple-400 font-bold">{tokenName}</span></p>
                        <p className="text-gray-300"><strong>Quantity:</strong> <span className="text-white font-semibold">{formatUnits(lock.amount, DECIMALS)}</span></p>
                        <p className="text-gray-300">
                          <strong>Unlock:</strong>{' '}
                          {canWithdraw ? (
                            <span className="text-green-400 font-bold text-xl">Available now!</span>
                          ) : (
                            <span className="text-orange-400 font-bold">Through {daysLeft} {daysLeft === 1 ? 'day' : 'days'}</span>
                          )}
                        </p>

                        {lock.withdrawn ? (
                          <p className="text-green-400 font-bold text-lg">✓ Withdrawn</p>
                        ) : (
                          <button
                            disabled={!canWithdraw || isTxPending}
                            onClick={() => writeContract({
                              address: LOCK_CONTRACT,
                              abi: LOCK_ABI,
                              functionName: 'withdraw',
                              args: [BigInt(i)],
                            })}
                            className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl disabled:opacity-60 transition shadow-lg"
                          >
                            Withdraw tokens
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 text-xl py-12">No active locks</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
