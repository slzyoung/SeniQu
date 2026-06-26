import { useState, useEffect, useRef } from 'react';

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
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        let reconnectTimer: NodeJS.Timeout;
        let pollingTimer: NodeJS.Timeout;
        let isComponentMounted = true;

        // HTTP Fallback fetching
        const fetchPricesHTTP = async () => {
            if (!isComponentMounted) return;
            
            // Try CoinGecko first (highly reliable, not blocked)
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
                        return;
                    }
                }
            } catch (e) {
                // Fail silently to next fallback
            }

            // Try CryptoCompare as fallback
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
                        return;
                    }
                }
            } catch (e) {
                // Fail silently
            }
        };

        // Connect to Coinbase WebSocket (Global, stable, not blocked by Indonesian ISPs)
        const connectWebSocket = () => {
            if (!isComponentMounted) return;

            const wsUrl = 'wss://ws-feed.exchange.coinbase.com';
            
            try {
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isComponentMounted) return;
                    console.log('[useTokenPrices] Connected to Coinbase WebSocket');
                    setIsLoading(false);

                    // Subscribe to ticker channel
                    const subscribeMessage = {
                        type: 'subscribe',
                        product_ids: ['SOL-USD', 'ETH-USD', 'USDT-USD', 'USDC-USD'],
                        channels: ['ticker']
                    };
                    ws.send(JSON.stringify(subscribeMessage));
                };

                ws.onmessage = (event) => {
                    if (!isComponentMounted) return;
                    
                    try {
                        const data = JSON.parse(event.data);
                        if (data && data.type === 'ticker' && data.product_id && data.price) {
                            const price = parseFloat(data.price);
                            
                            setPrices(prev => {
                                const newPrices = { ...prev };
                                if (data.product_id === 'SOL-USD') newPrices.solana = price;
                                else if (data.product_id === 'ETH-USD') newPrices.ethereum = price;
                                else if (data.product_id === 'USDT-USD') newPrices.tether = price;
                                else if (data.product_id === 'USDC-USD') newPrices['usd-coin'] = price;
                                return newPrices;
                            });
                        }
                    } catch (err) {
                        // Fail silently
                    }
                };

                ws.onerror = (error) => {
                    console.warn('[useTokenPrices] Coinbase WebSocket error observed:', error);
                };

                ws.onclose = () => {
                    if (isComponentMounted) {
                        console.log('[useTokenPrices] WebSocket closed. Reconnecting in 8s...');
                        reconnectTimer = setTimeout(connectWebSocket, 8000);
                    }
                };
            } catch (err) {
                console.warn('[useTokenPrices] Failed to initialize WebSocket:', err);
                if (isComponentMounted) {
                    reconnectTimer = setTimeout(connectWebSocket, 8000);
                }
            }
        };

        // Start WebSocket connection
        connectWebSocket();

        // Fetch initial prices immediately
        fetchPricesHTTP();

        // Interval polling fallback (every 15 seconds) to ensure realtime prices
        // even if WebSocket is blocked or disconnected
        pollingTimer = setInterval(fetchPricesHTTP, 15000);

        return () => {
            isComponentMounted = false;
            clearTimeout(reconnectTimer);
            clearInterval(pollingTimer);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return { prices, isLoading };
};
