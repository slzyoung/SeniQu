/**
 * Institution Profile Page
 * Premium light-theme design for artists acting as institutions.
 */

import { Building2, Save, MapPin, Globe, Phone, Mail } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, Button } from '../../../components/ui';
import { useAuthStore } from '../../../stores/useAuthStore';

export function InstitutionProfile() {
    const { user } = useAuthStore();

    return (
        <PageContainer
            title="Institution Profile"
            description="Manage your institutional presence and public contact details"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card variant="elevated" className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                            <h3 className="text-xl font-bold text-gray-900">Basic Information</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Institution Name</label>
                                <input type="text" defaultValue={user?.displayName || ''} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                <textarea rows={4} placeholder="Describe your institution..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 px-8 py-2.5 rounded-xl">
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card variant="elevated" className="p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Contact & Location</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><MapPin className="w-4 h-4" /> Address</label>
                                <input type="text" placeholder="Full address" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Globe className="w-4 h-4" /> Website</label>
                                <input type="url" placeholder="https://" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2"><Mail className="w-4 h-4" /> Email</label>
                                <input type="email" defaultValue={user?.email || ''} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}

export default InstitutionProfile;
