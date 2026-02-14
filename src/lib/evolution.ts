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

    try {
        const response = await fetch(`${url}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Evolution API error: ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error?.message || JSON.stringify(errorJson);
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            console.error(`[Evolution API Error] ${method} ${endpoint}:`, errorMessage);
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error: any) {
        if (error.message?.includes('fetch failed')) {
            throw new Error(`Erro de conexão com o servidor Evolution API (${url}). Verifique se a URL está correta.`);
        }
        throw error;
    }
}

export async function checkInstanceStatus(instanceName: string, baseUrl?: string, token?: string) {
    try {
        const data = await fetchEvolution(`/instance/connectionState/${instanceName.trim()}`, 'GET', undefined, baseUrl, token);
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

export async function createInstance(instanceName: string, baseUrl?: string, token?: string) {
    try {
        const trimmedName = instanceName.trim().replace(/\s+/g, '_');
        const body = {
            instanceName: trimmedName,
            token: token || '', // Let Evolution generate one if not provided, or use provided
            qrcode: true,
            integration: 'BAILEYS' // Explicit default for v2
        };
        return await fetchEvolution('/instance/create', 'POST', body, baseUrl, token);
    } catch (error) {
        console.error('Error creating instance:', error);
        throw error;
    }
}

export async function getQRCode(instanceName: string, baseUrl?: string, token?: string) {
    try {
        const data = await fetchEvolution(`/instance/connect/${instanceName}`, 'GET', undefined, baseUrl, token);
        return data.base64; // QR code base64
    } catch (error: any) {
        // If the instance is not found, throw a specific signal
        if (error.message?.includes('Not Found') || error.message?.includes('404')) {
            throw new Error('INSTANCE_NOT_FOUND');
        }
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
        // First get connection state
        const rawData = await fetchEvolution(`/instance/connectionState/${instance.instanceName}`, 'GET', undefined, instance.apiUrl, instance.instanceToken).catch(() => null);

        // Handle both Evolution v1 (data.instance.state) and v2 (data.state)
        const status = rawData?.state || rawData?.instance?.state || 'Disconnected';

        let phoneNumber = instance.phoneNumber;
        let profileName = instance.profileName;
        let profilePicUrl = instance.profilePicUrl;

        // In most v2 setups, connectionState DOES NOT have the numbers.
        // We MUST use fetchInstances to get the ownerJid/profileName/profilePicUrl
        if (status === 'open') {
            try {
                const data = await fetchEvolution(`/instance/fetchInstances`, 'GET', undefined, instance.apiUrl, instance.instanceToken);

                const instancesList = Array.isArray(data) ? data : (data.instances || []);

                // Find our instance (case-insensitive)
                const apiInstance = instancesList.find((i: any) => {
                    const name = i.name || i.instanceName || i.instance?.name || i.instance?.instanceName;
                    return name?.toLowerCase() === instance.instanceName.toLowerCase();
                });

                if (apiInstance) {
                    // Extract Phone Number: Prioritize ownerJid (common in Baileys) or number (common in Business)
                    let rawPhone = apiInstance.ownerJid || apiInstance.number || apiInstance.wid || apiInstance.jid;
                    if (rawPhone) {
                        // Clean: 559180574359@s.whatsapp.net -> 559180574359
                        phoneNumber = String(rawPhone).split('@')[0].split(':')[0];
                    }

                    // Extract Profile Name
                    profileName = apiInstance.profileName || apiInstance.name || apiInstance.pushName || profileName;

                    // Extract Profile Pic
                    profilePicUrl = apiInstance.profilePicUrl || apiInstance.profilePic || profilePicUrl;
                }
            } catch (err) {
                console.warn(`[SYNC] Could not fetch details for ${instance.instanceName}:`, err);
            }
        }

        await saveWhatsAppInstance({
            id,
            status,
            phoneNumber,
            profileName,
            profilePicUrl
        });

        // Revalidate paths for live updates
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
    revalidatePath('/superadmin/whatsapp');
}
