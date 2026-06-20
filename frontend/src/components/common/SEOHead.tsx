/**
 * SEOHead — Dynamic per-page SEO meta tag manager
 * Sets document.title and injects/updates meta tags without external dependencies.
 * 
 * Usage:
 *   <SEOHead
 *     title="Gallery — SeniQu"
 *     description="Explore Indonesian art heritage..."
 *     canonical="/gallery"
 *     ogImage="https://seniqu.art/images/logo/seniqu.png"
 *   />
 */

import { useEffect } from 'react';

const SITE_NAME = 'SeniQu';
const BASE_URL = 'https://seniqu.art';
const DEFAULT_OG_IMAGE = `${BASE_URL}/images/logo/seniqu.png`;
const DEFAULT_DESCRIPTION =
    'Indonesian cultural heritage digital platform. Explore museums art galleries and historical sites with AI and Solana blockchain technology.';

interface SEOHeadProps {
    /** Page title — will be appended with " — SeniQu" if not already present */
    title?: string;
    /** Meta description for the page */
    description?: string;
    /** Canonical URL path (e.g. "/gallery"). Full URL will be constructed automatically. */
    canonical?: string;
    /** Open Graph image URL */
    ogImage?: string;
    /** Set to true for pages that should not be indexed (e.g. auth pages) */
    noindex?: boolean;
    /** Open Graph type (defaults to "website") */
    ogType?: string;
}

function setMetaTag(property: string, content: string, isProperty = false) {
    const attr = isProperty ? 'property' : 'name';
    let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;

    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
    }

    el.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
    let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
    }

    el.setAttribute('href', href);
}

export function SEOHead({
    title,
    description = DEFAULT_DESCRIPTION,
    canonical,
    ogImage = DEFAULT_OG_IMAGE,
    noindex = false,
    ogType = 'website',
}: SEOHeadProps) {
    useEffect(() => {
        // Build the full title
        const fullTitle = title
            ? title.includes(SITE_NAME) ? title : `${title} ${SITE_NAME}`
            : `${SITE_NAME} Indonesian Cultural Heritage Platform`;

        // Set document title
        document.title = fullTitle;

        // Primary meta tags
        setMetaTag('description', description);
        setMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');

        // Open Graph
        setMetaTag('og:title', fullTitle, true);
        setMetaTag('og:description', description, true);
        setMetaTag('og:image', ogImage, true);
        setMetaTag('og:type', ogType, true);
        setMetaTag('og:site_name', SITE_NAME, true);

        if (canonical) {
            const fullCanonical = canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical}`;
            setMetaTag('og:url', fullCanonical, true);
            setLinkTag('canonical', fullCanonical);
        }

        // Twitter Card
        setMetaTag('twitter:card', 'summary_large_image');
        setMetaTag('twitter:title', fullTitle);
        setMetaTag('twitter:description', description);
        setMetaTag('twitter:image', ogImage);

        // Cleanup: restore default title on unmount (optional)
        return () => {
            // Don't reset — let next page's SEOHead take over
        };
    }, [title, description, canonical, ogImage, noindex, ogType]);

    // This component renders nothing — it only manages <head> side effects
    return null;
}

export default SEOHead;
