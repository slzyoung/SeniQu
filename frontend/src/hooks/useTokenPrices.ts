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
        let isComponentMounted = true;

        const connectWebSocket = () => {
            // Use Binance miniTicker stream for lighter payload
            // solusdt for Solana, ethusdt for Ethereum, usdcusdt for USDC. Tether is pegged to 1.
            const wsUrl = 'wss://stream.binance.com:9443/ws/solusdt@miniTicker/ethusdt@miniTicker/usdcusdt@miniTicker';
            
            try {
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log('[useTokenPrices] Connected to Binance WebSocket');
                    setIsLoading(false);
                };

                ws.onmessage = (event) => {
                    if (!isComponentMounted) return;
                    
                    try {
                        const data = JSON.parse(event.data);
                        // The 's' property is the symbol (e.g. 'SOLUSDT'), 'c' is the close price
                        if (data && data.s && data.c) {
                            const price = parseFloat(data.c);
                            
                            setPrices(prev => {
                                const newPrices = { ...prev };
                                if (data.s === 'SOLUSDT') newPrices.solana = price;
                                else if (data.s === 'ETHUSDT') newPrices.ethereum = price;
                                else if (data.s === 'USDCUSDT') newPrices['usd-coin'] = price;
                                return newPrices;
                            });
                        }
                    } catch (err) {
                        console.error('[useTokenPrices] Error parsing websocket data', err);
                    }
                };

                ws.onerror = (error) => {
                    console.warn('[useTokenPrices] WebSocket error observed:', error);
                };

                ws.onclose = () => {
                    if (isComponentMounted) {
                        console.log('[useTokenPrices] WebSocket closed. Reconnecting in 5s...');
                        // Attempt to reconnect
                        reconnectTimer = setTimeout(connectWebSocket, 5000);
                    }
                };
            } catch (err) {
                console.warn('[useTokenPrices] Failed to initialize WebSocket:', err);
                if (isComponentMounted) {
                    reconnectTimer = setTimeout(connectWebSocket, 5000);
                }
            }
        };

        connectWebSocket();

        // Optional: fetch initial values via HTTP so we don't wait for the first WS tick
        const fetchInitialPrices = async () => {
            try {
                const response = await fetch(
                    'https://min-api.cryptocompare.com/data/pricemulti?fsyms=SOL,ETH,USDT,USDC&tsyms=USD'
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.SOL?.USD && isComponentMounted) {
                        setPrices(prev => ({
                            ...prev,
                            solana: data.SOL.USD,
                            ethereum: data.ETH?.USD || prev.ethereum,
                            tether: data.USDT?.USD || prev.tether,
                            'usd-coin': data.USDC?.USD || prev['usd-coin'],
                        }));
                        setIsLoading(false);
                    }
                }
            } catch (err) {
                // Ignore fallback errors
            }
        };
        fetchInitialPrices();

        return () => {
            isComponentMounted = false;
            clearTimeout(reconnectTimer);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return { prices, isLoading };
};
