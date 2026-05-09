/**
 * Admin Pages - Placeholder Components
 */

import React from 'react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card } from '../../../components/ui';
import {
    Building2, Users, BarChart3, Database, FileText,
    Shield, ShoppingBag, Crown, Settings, Activity,
    Flag, Handshake, Bell, User, Ticket, Megaphone, Images, FolderHeart
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';

// Generic placeholder component
function PlaceholderPage({
    title,
    description,
    icon: Icon
}: {
    title: string;
    description: string;
    icon: React.ElementType;
}) {
    return (
        <PageContainer title={title} subtitle={description}>
            <Card variant="elevated" className="text-center py-16">
                <Icon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-theme-text mb-2">{title}</h3>
                <p className="text-theme-muted max-w-sm mx-auto">
                    This feature is currently being developed and will be available soon.
                </p>
            </Card>
        </PageContainer>
    );
}

export function InstitutionManagement() {
    return <PlaceholderPage title="Institution Management" description="Manage museums, galleries, and cultural institutions" icon={Building2} />;
}

export function AdminManagement() {
    return <PlaceholderPage title="User & Admin Management" description="Manage users, roles, and permissions" icon={Users} />;
}

export function SystemAnalytics() {
    return <PlaceholderPage title="System Analytics" description="View detailed platform analytics and metrics" icon={BarChart3} />;
}

export function DatabaseManagement() {
    return <PlaceholderPage title="Database Management" description="Manage database operations and backups" icon={Database} />;
}

export function SystemLogs() {
    return <PlaceholderPage title="System Logs" description="View and search system logs" icon={FileText} />;
}

export function SecurityCenter() {
    return <PlaceholderPage title="Security Center" description="Manage security settings and monitor threats" icon={Shield} />;
}

export function ArtsOversight() {
    return <PlaceholderPage title="Arts Marketplace Oversight" description="Monitor and manage art transactions" icon={ShoppingBag} />;
}

export function PremiumManagement() {
    return <PlaceholderPage title="Premium Management" description="Manage premium subscriptions and features" icon={Crown} />;
}

export function GlobalSettings() {
    return <PlaceholderPage title="Global Settings" description="Configure platform-wide settings" icon={Settings} />;
}

export function SystemHealth() {
    return <PlaceholderPage title="System Health" description="Monitor system performance and health" icon={Activity} />;
}

export function ReportsIssues() {
    return <PlaceholderPage title="Reports & Issues" description="Review user reports and platform issues" icon={Flag} />;
}

export function PartnershipManagement() {
    return <PlaceholderPage title="Partnership Management" description="Manage institutional partnerships" icon={Handshake} />;
}

export function SystemAlerts() {
    return <PlaceholderPage title="System Alerts" description="Configure and manage system alerts" icon={Bell} />;
}

export function AdminProfile() {
    return <PlaceholderPage title="Admin Profile" description="Manage your admin profile settings" icon={User} />;
}

export function AdminArtworks() {
    const { user } = useAuthStore();
    const role = (user as any)?.adminRole || '';
    let title = "Collection & Arts";
    let desc = "Manage artworks and institutional collections";
    if (role === 'MUSEUM_ADMIN') { title = "Museum Collection"; desc = "Manage your museum's permanent collection and incoming loans."; }
    if (role === 'GALLERY_ADMIN') { title = "Art Submissions"; desc = "Review and manage artwork submissions from artists."; }
    if (role === 'HERITAGE_ADMIN') { title = "Artifact Records"; desc = "Manage historical artifacts and preservation records."; }

    return <PlaceholderPage title={title} description={desc} icon={FolderHeart} />;
}

export function AdminTickets() {
    const { user } = useAuthStore();
    const role = (user as any)?.adminRole || '';
    let title = "Ticketing (Harga Tiket)";
    let desc = "Manage ticket prices and admissions";
    if (role === 'HERITAGE_ADMIN') { title = "Site Admission"; desc = "Manage visitor access and guided tour passes."; }

    return <PlaceholderPage title={title} description={desc} icon={Ticket} />;
}

export function AdminPromotions() {
    const { user } = useAuthStore();
    const role = (user as any)?.adminRole || '';
    let title = "Promotions & Events";
    let desc = "Manage institutional promotions and events";
    if (role === 'MUSEUM_ADMIN') { title = "Exhibitions"; desc = "Plan and publish upcoming museum exhibitions."; }
    if (role === 'GALLERY_ADMIN') { title = "Featured Artists"; desc = "Manage featured artist campaigns and gallery promos."; }

    return <PlaceholderPage title={title} description={desc} icon={Megaphone} />;
}

export function AdminBanners() {
    const { user } = useAuthStore();
    const role = (user as any)?.adminRole || '';
    let title = "Banner & Branding";
    let desc = "Manage institutional banners and visual branding";
    if (role === 'HERITAGE_ADMIN') { title = "Virtual Tours"; desc = "Configure 3D virtual tours and site photography."; }

    return <PlaceholderPage title={title} description={desc} icon={Images} />;
}

export default {
        InstitutionManagement,
        AdminManagement,
        SystemAnalytics,
        DatabaseManagement,
        SystemLogs,
        SecurityCenter,
        ArtsOversight,
        PremiumManagement,
        GlobalSettings,
        SystemHealth,
        ReportsIssues,
        PartnershipManagement,
        SystemAlerts,
        AdminProfile,
    };