import { useState, useEffect } from 'react';

interface TokenPrices {
    solana: number;
    ethereum: number;
    tether: number;
    'usd-coin': number;
}

const DEFAULT_PRICES: TokenPrices = {
    solana: 150.00,
    ethereum: 3500.00,
    tether: 1.00,
    'usd-coin': 1.00,
};

export const useTokenPrices = () => {
    const [prices, setPrices] = useState<TokenPrices>(DEFAULT_PRICES);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPrices = async () => {
        try {
            // Primary: CryptoCompare (more reliable for public unauthenticated requests)
            try {
                const response = await fetch(
                    'https://min-api.cryptocompare.com/data/pricemulti?fsyms=SOL,ETH,USDT,USDC&tsyms=USD'
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.SOL?.USD) {
                        setPrices({
                            solana: data.SOL.USD,
                            ethereum: data.ETH?.USD || DEFAULT_PRICES.ethereum,
                            tether: data.USDT?.USD || DEFAULT_PRICES.tether,
                            'usd-coin': data.USDC?.USD || DEFAULT_PRICES['usd-coin'],
                        });
                        setIsLoading(false);
                        return; // Success, exit
                    }
                }
            } catch (err) {
                console.warn('[useTokenPrices] CryptoCompare failed, trying fallback...', err);
            }

            // Fallback: CoinGecko
            try {
                const response = await fetch(
                    'https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum,tether,usd-coin&vs_currencies=usd'
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.solana?.usd) {
                        setPrices({
                            solana: data.solana.usd,
                            ethereum: data.ethereum?.usd || DEFAULT_PRICES.ethereum,
                            tether: data.tether?.usd || DEFAULT_PRICES.tether,
                            'usd-coin': data['usd-coin']?.usd || DEFAULT_PRICES['usd-coin'],
                        });
                        setIsLoading(false);
                        return; // Success, exit
                    }
                }
            } catch (err) {
                console.warn('[useTokenPrices] CoinGecko fallback failed.', err);
            }

            // If all APIs fail, use last known prices or defaults
            setIsLoading(false);

        } catch (error) {
            console.warn('[useTokenPrices] All price fetching methods failed.');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
        // Refresh every 30 seconds for more real-time feel
        const interval = setInterval(fetchPrices, 30000);
        return () => clearInterval(interval);
    }, []);

    return { prices, isLoading };
};
