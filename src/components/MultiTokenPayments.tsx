'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LazyIcon } from '@/components/ui/LazyIcon';

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  usdValue: number;
  logo: string;
}

export default function MultiTokenPayments() {
  const [supportedTokens, setSupportedTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('ETH');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [gasEstimate, setGasEstimate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock supported tokens data
    const mockTokens: Token[] = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        balance: '2.5847',
        usdValue: 2584.70,
        logo: '🔷'
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xA0b86a33E6441e0D5d7b8F2d3c5a4a8C8c9a5e5c',
        decimals: 6,
        balance: '1,250.00',
        usdValue: 1250.00,
        logo: '💵'
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6,
        balance: '500.00',
        usdValue: 500.00,
        logo: '💰'
      },
      {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        decimals: 18,
        balance: '750.25',
        usdValue: 750.25,
        logo: '🏛️'
      }
    ];
    
    setSupportedTokens(mockTokens);
  }, []);

  const selectedTokenData = supportedTokens.find(token => token.symbol === selectedToken);

  const calculateGasEstimate = () => {
    // Mock gas calculation
    const baseGas = selectedToken === 'ETH' ? '21,000' : '65,000';
    setGasEstimate(baseGas);
  };

  const handleTokenChange = (tokenSymbol: string) => {
    setSelectedToken(tokenSymbol);
    if (amount) {
      calculateGasEstimate();
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (value && selectedToken) {
      calculateGasEstimate();
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Mock payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`Payment of ${amount} ${selectedToken} sent successfully!`);
      setAmount('');
      setRecipient('');
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: string, symbol: string) => {
    const numBalance = parseFloat(balance.replace(/,/g, ''));
    return `${balance} ${symbol}`;
  };

  const formatUsdValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Multi-Token Payment System
        </h1>
        <p className="text-lg text-gray-600">
          Send payments using various cryptocurrencies and stablecoins
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Balances */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Token Balances
            </h3>
            <div className="space-y-3">
              {supportedTokens.map((token) => (
                <div
                  key={token.symbol}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedToken === token.symbol
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTokenChange(token.symbol)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{token.logo}</span>
                      <div>
                        <p className="font-medium text-gray-900">{token.symbol}</p>
                        <p className="text-sm text-gray-500">{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatBalance(token.balance, token.symbol)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatUsdValue(token.usdValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Send Payment
            </h3>
            
            <div className="space-y-4">
              {/* Token Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Token
                </label>
                <div className="relative">
                  <select
                    value={selectedToken}
                    onChange={(e) => handleTokenChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {supportedTokens.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.logo} {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recipient Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 text-sm font-medium">
                      {selectedToken}
                    </span>
                  </div>
                </div>
                {selectedTokenData && amount && (
                  <p className="text-sm text-gray-500 mt-1">
                    ≈ {formatUsdValue(parseFloat(amount) * (selectedTokenData.usdValue / parseFloat(selectedTokenData.balance.replace(/,/g, ''))))}
                  </p>
                )}
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Amount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['25%', '50%', '75%', 'Max'].map((percentage) => (
                    <Button
                      key={percentage}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedTokenData) {
                          const balance = parseFloat(selectedTokenData.balance.replace(/,/g, ''));
                          let amount = 0;
                          switch (percentage) {
                            case '25%':
                              amount = balance * 0.25;
                              break;
                            case '50%':
                              amount = balance * 0.5;
                              break;
                            case '75%':
                              amount = balance * 0.75;
                              break;
                            case 'Max':
                              amount = balance;
                              break;
                          }
                          handleAmountChange(amount.toString());
                        }
                      }}
                    >
                      {percentage}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Gas Estimate */}
              {gasEstimate && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Estimated Gas:</span>
                    <span className="font-medium">{gasEstimate} units</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Gas Fee:</span>
                    <span className="font-medium">~$2.50</span>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <Button
                onClick={handlePayment}
                disabled={!amount || !recipient || loading}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <LazyIcon name="ArrowsRightLeftIcon" className="h-4 w-4 mr-2" />
                    Send {selectedToken}
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Transactions
          </h3>
          <div className="space-y-3">
            {[
              {
                id: '1',
                type: 'sent',
                token: 'USDC',
                amount: '500.00',
                recipient: '0x1234...5678',
                status: 'completed',
                timestamp: '2024-01-30 14:30:00',
                txHash: '0xabcd...ef12'
              },
              {
                id: '2',
                type: 'received',
                token: 'ETH',
                amount: '0.5',
                sender: '0x9876...4321',
                status: 'completed',
                timestamp: '2024-01-29 10:15:00',
                txHash: '0x1234...abcd'
              },
              {
                id: '3',
                type: 'sent',
                token: 'DAI',
                amount: '250.00',
                recipient: '0x5678...9012',
                status: 'pending',
                timestamp: '2024-01-29 09:45:00',
                txHash: '0xef12...3456'
              }
            ].map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    tx.type === 'sent' ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    <LazyIcon name="ArrowsRightLeftIcon" className={`h-4 w-4 ${
                      tx.type === 'sent' ? 'text-red-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {tx.type === 'sent' ? 'Sent' : 'Received'} {tx.amount} {tx.token}
                    </p>
                    <p className="text-sm text-gray-500">
                      {tx.type === 'sent' ? `To: ${tx.recipient}` : `From: ${tx.sender}`}
                    </p>
                    <p className="text-xs text-gray-400">{tx.timestamp}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    tx.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tx.status === 'completed' ? (
                      <LazyIcon name="CheckCircleIcon" className="h-3 w-3 mr-1" />
                    ) : (
                      <LazyIcon name="ExclamationTriangleIcon" className="h-3 w-3 mr-1" />
                    )}
                    {tx.status}
                  </span>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
