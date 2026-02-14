'use server';

import { saveWhatsAppInstance, getWhatsAppInstanceById } from './db';
import { revalidatePath } from 'next/cache';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://api.evolution.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

async function fetchEvolution(endpoint: string, method: string = 'GET', body?: any, baseUrl?: string, token?: string) {
    const url = (baseUrl || EVOLUTION_API_URL).replace(/\/$/, '');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': token || EVOLUTION_API_KEY,
    };

    const response = await fetch(`${url}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `Evolution API error: ${response.statusText}`);
    }

    return response.json();
}

export async function checkInstanceStatus(instanceName: string, baseUrl?: string, token?: string) {
    try {
        const data = await fetchEvolution(`/instance/connectionState/${instanceName}`, 'GET', undefined, baseUrl, token);
        // Handle both Evolution v1 (data.instance.state) and v2 (data.state)
        return data.state || data.instance?.state || 'Disconnected';
    } catch (error) {
        console.error('Error checking instance status:', error);
        return 'Disconnected';
    }
}

export async function fetchInstancesFromServer(baseUrl: string, token: string) {
    try {
        const data = await fetchEvolution('/instance/fetchInstances', 'GET', undefined, baseUrl, token);
        return Array.isArray(data) ? data : (data.instances || []);
    } catch (error) {
        console.error('Error fetching instances from server:', error);
        throw error;
    }
}

export async function getQRCode(instanceName: string, baseUrl?: string, token?: string) {
    try {
        const data = await fetchEvolution(`/instance/connect/${instanceName}`, 'GET', undefined, baseUrl, token);
        return data.base64; // QR code base64
    } catch (error) {
        console.error('Error getting QR code:', error);
        throw error;
    }
}

export async function logoutInstance(instanceName: string, baseUrl?: string, token?: string) {
    try {
        await fetchEvolution(`/instance/logout/${instanceName}`, 'DELETE', undefined, baseUrl, token);
        return true;
    } catch (error) {
        console.error('Error logging out instance:', error);
        throw error;
    }
}

export async function syncInstanceData(id: string) {
    const instance = await getWhatsAppInstanceById(id);
    if (!instance) return;

    try {
        // First get connection state, it often contains number/name in v2
        const rawData = await fetchEvolution(`/instance/connectionState/${instance.instanceName}`, 'GET', undefined, instance.apiUrl, instance.instanceToken).catch(() => null);

        // Handle both Evolution v1 (data.instance.state) and v2 (data.state)
        const status = rawData?.state || rawData?.instance?.state || 'Disconnected';

        let phoneNumber = instance.phoneNumber;
        let profileName = instance.profileName;

        if (status === 'open') {
            // Try to get info from connectionState first (v2 style)
            const connDetails = rawData?.instance || rawData;
            let rawPhone = connDetails?.owner || connDetails?.number || connDetails?.wid || connDetails?.jid;
            let rawProfile = connDetails?.profileName || connDetails?.name || connDetails?.pushName;

            // If not found in connectionState, try fetchInstances
            if (!rawPhone || !rawProfile) {
                try {
                    const data = await fetchEvolution(`/instance/fetchInstances`, 'GET', undefined, instance.apiUrl, instance.instanceToken);
                    const instancesList = Array.isArray(data) ? data : (data.instances || []);
                    const si = instancesList.find((i: any) => {
                        const name = i.instanceName || i.instance?.instanceName;
                        return name?.toLowerCase() === instance.instanceName.toLowerCase();
                    });

                    if (si) {
                        const details = si.instance || si;
                        rawPhone = rawPhone || details.owner || details.number || details.wid || details.jid;
                        rawProfile = rawProfile || details.profileName || details.name || details.pushName;
                    }
                } catch (err) {
                    console.warn('Failed to fetchInstances for details:', instance.instanceName);
                }
            }

            if (rawPhone && typeof rawPhone === 'string') {
                phoneNumber = rawPhone.split('@')[0].split(':')[0];
            }
            if (rawProfile) {
                profileName = rawProfile;
            }
        }

        await saveWhatsAppInstance({
            id,
            status,
            phoneNumber,
            profileName
        });

        revalidatePath('/whatsapp');
        revalidatePath('/superadmin/whatsapp');
    } catch (error) {
        console.error('Error syncing instance data:', error);
    }
}
export async function syncAllInstances(redeId?: string) {
    const { getWhatsAppInstances } = await import('./db');
    const instances = await getWhatsAppInstances(redeId);

    for (const instance of instances) {
        await syncInstanceData(instance.id);
    }

    revalidatePath('/whatsapp');
}
