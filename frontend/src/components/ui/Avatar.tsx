/**
 * Avatar Component - User avatar with fallback
 */

import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
    src?: string | null;
    alt?: string;
    name?: string;
    size?: AvatarSize;
    className?: string;
    showStatus?: boolean;
    status?: 'online' | 'offline' | 'away' | 'busy';
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
    xs: { container: 'w-6 h-6', text: 'text-[10px]', status: 'w-1.5 h-1.5' },
    sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2 h-2' },
    md: { container: 'w-10 h-10', text: 'text-sm', status: 'w-2.5 h-2.5' },
    lg: { container: 'w-12 h-12', text: 'text-base', status: 'w-3 h-3' },
    xl: { container: 'w-16 h-16', text: 'text-lg', status: 'w-3.5 h-3.5' },
    '2xl': { container: 'w-24 h-24', text: 'text-2xl', status: 'w-4 h-4' },
};

const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
};

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function getColorFromName(name: string): string {
    const colors = [
        'bg-gradient-to-br from-purple-500 to-pink-500',
        'bg-gradient-to-br from-blue-500 to-cyan-500',
        'bg-gradient-to-br from-green-500 to-emerald-500',
        'bg-gradient-to-br from-orange-500 to-amber-500',
        'bg-gradient-to-br from-rose-500 to-red-500',
        'bg-gradient-to-br from-indigo-500 to-violet-500',
    ];

    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

export function Avatar({
    src,
    alt = '',
    name = 'User',
    size = 'md',
    className = '',
    showStatus = false,
    status = 'online',
}: AvatarProps) {
    const styles = sizeStyles[size];
    const [imgError, setImgError] = React.useState(false);
    
    React.useEffect(() => {
        setImgError(false);
    }, [src]);

    const showFallback = !src || imgError;

    return (
        <div className={`relative inline-flex ${className}`}>
            <div
                className={`
          ${styles.container}
          rounded-full overflow-hidden
          flex items-center justify-center
          ring-2 ring-theme-border
          ${showFallback ? getColorFromName(name) : 'bg-theme-elevated'}
        `}
            >
                {showFallback ? (
                    <span className={`font-semibold text-white ${styles.text}`}>
                        {getInitials(name)}
                    </span>
                ) : (
                    <img
                        src={src}
                        alt={alt || name}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                )}
            </div>

            {showStatus && (
                <span
                    className={`
            absolute bottom-0 right-0
            ${styles.status}
            ${statusColors[status]}
            rounded-full ring-2 ring-theme-bg
          `}
                />
            )}
        </div>
    );
}

// Avatar Group
interface AvatarGroupProps {
    avatars: Array<{ src?: string; name: string }>;
    max?: number;
    size?: AvatarSize;
    className?: string;
}

export function AvatarGroup({
    avatars,
    max = 4,
    size = 'sm',
    className = '',
}: AvatarGroupProps) {
    const displayed = avatars.slice(0, max);
    const remaining = avatars.length - max;

    return (
        <div className={`flex -space-x-2 ${className}`}>
            {displayed.map((avatar, index) => (
                <Avatar
                    key={index}
                    src={avatar.src}
                    name={avatar.name}
                    size={size}
                />
            ))}

            {remaining > 0 && (
                <div
                    className={`
            ${sizeStyles[size].container}
            rounded-full bg-theme-elevated
            flex items-center justify-center
            ring-2 ring-theme-bg
            ${sizeStyles[size].text} font-medium text-theme-muted
          `}
                >
                    +{remaining}
                </div>
            )}
        </div>
    );
}

export default Avatar;
