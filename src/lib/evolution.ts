'use server';

import { saveWhatsAppInstance, getWhatsAppInstanceById } from './db';
import { revalidatePath } from 'next/cache';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://api.evolution.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

async function fetchEvolution(endpoint: string, method: string = 'GET', body?: any, instanceToken?: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
    };

    const response = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
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

export async function checkInstanceStatus(instanceName: string) {
    try {
        const data = await fetchEvolution(`/instance/connectionStatus/${instanceName}`);
        return data.instance.state; // 'open', 'close', etc.
    } catch (error) {
        console.error('Error checking instance status:', error);
        return 'Disconnected';
    }
}

export async function getQRCode(instanceName: string) {
    try {
        const data = await fetchEvolution(`/instance/connect/${instanceName}`);
        return data.base64; // QR code base64
    } catch (error) {
        console.error('Error getting QR code:', error);
        throw error;
    }
}

export async function logoutInstance(instanceName: string) {
    try {
        await fetchEvolution(`/instance/logout/${instanceName}`, 'DELETE');
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
        const status = await checkInstanceStatus(instance.instanceName);
        let phoneNumber = instance.phoneNumber;

        if (status === 'open') {
            const info = await fetchEvolution(`/instance/fetchInstances?instanceName=${instance.instanceName}`);
            // Evolution might return various data structures, this is a placeholder for actual response mapping
            phoneNumber = info?.[0]?.owner || phoneNumber;
        }

        await saveWhatsAppInstance({
            id,
            status,
            phoneNumber
        });

        revalidatePath('/whatsapp');
    } catch (error) {
        console.error('Error syncing instance data:', error);
    }
}
