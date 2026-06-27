import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const SpotifyAuthBridge: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Skip Spotify authentication processing on the Google OAuth callback page
        // or if the URL hash contains Google OAuth params (user or refresh_token)
        if (location.pathname === '/auth/callback') {
            return;
        }
        if (location.hash) {
            const params = new URLSearchParams(location.hash.substring(1));
            if (params.has('user') || params.has('refresh_token')) {
                return;
            }
        }

        // 1. Check for Spotify code in URL query params (Authorization Code Flow with PKCE)
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');

        if (code) {
            const codeVerifier = localStorage.getItem('spotify_code_verifier') || '';
            const clientId = localStorage.getItem('spotify_client_id') || '581c7f9994c944439c279c93df32d3d3';
            const redirectUri = window.location.origin + '/';

            // Clean query parameters from URL immediately
            const cleanedSearch = new URLSearchParams(location.search);
            cleanedSearch.delete('code');
            const searchString = cleanedSearch.toString();
            const newUrl = location.pathname + (searchString ? `?${searchString}` : '') + location.hash;
            window.history.replaceState(null, '', window.location.origin + newUrl);

            // Exchange authorization code for token
            const payload = new URLSearchParams({
                client_id: clientId,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            });

            fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: payload,
            })
            .then(res => res.json())
            .then(data => {
                if (data.access_token) {
                    localStorage.setItem('spotify_token', data.access_token);
                    localStorage.setItem('spotify_token_expires', String(Date.now() + (data.expires_in || 3600) * 1000));
                    
                    // Dispatch a custom event to notify any mounted components that token changed
                    window.dispatchEvent(new Event('spotify_token_updated'));

                    // Redirect back to the page the user was on before starting Spotify OAuth
                    const redirectBack = localStorage.getItem('spotify_redirect_back');
                    if (redirectBack) {
                        localStorage.removeItem('spotify_redirect_back');
                        navigate(redirectBack);
                    }
                } else {
                    console.error('Spotify token exchange failed:', data);
                }
            })
            .catch(err => {
                console.error('Error exchanging Spotify authorization code:', err);
            });
            return;
        }

        // 2. Check hash (Implicit Grant flow callback)
        if (location.hash) {
            const params = new URLSearchParams(location.hash.substring(1));
            const token = params.get('access_token');
            if (token) {
                localStorage.setItem('spotify_token', token);
                localStorage.setItem('spotify_token_expires', String(Date.now() + 3600 * 1000));
                
                // Clear hash
                window.history.replaceState(null, '', window.location.origin + location.pathname + location.search);
                
                // Dispatch token update event
                window.dispatchEvent(new Event('spotify_token_updated'));

                // Redirect back
                const redirectBack = localStorage.getItem('spotify_redirect_back');
                if (redirectBack) {
                    localStorage.removeItem('spotify_redirect_back');
                    navigate(redirectBack);
                }
            }
        }
    }, [location.search, location.hash, location.pathname, navigate]);

    return null;
};

export default SpotifyAuthBridge;
