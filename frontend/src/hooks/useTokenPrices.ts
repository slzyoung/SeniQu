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
            // Fetch from Coingecko (Simple Price API)
            // ids: solana, ethereum, tether, usd-coin
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum,tether,usd-coin&vs_currencies=usd'
            );

            if (!response.ok) throw new Error('Failed to fetch prices');

            const data = await response.json();

            setPrices({
                solana: data.solana?.usd || DEFAULT_PRICES.solana,
                ethereum: data.ethereum?.usd || DEFAULT_PRICES.ethereum,
                tether: data.tether?.usd || DEFAULT_PRICES.tether,
                'usd-coin': data['usd-coin']?.usd || DEFAULT_PRICES['usd-coin'],
            });
            setIsLoading(false);
        } catch (error) {
            console.warn('[useTokenPrices] Failed to fetch live prices, using defaults.', error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
        // Refresh every 60 seconds
        const interval = setInterval(fetchPrices, 60000);
        return () => clearInterval(interval);
    }, []);

    return { prices, isLoading };
};
