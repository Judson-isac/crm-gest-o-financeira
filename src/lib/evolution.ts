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

                // Specific handling for common errors
                if (response.status === 403 && errorText.includes('already in use')) {
                    errorMessage = 'Este nome de instância já está em uso no servidor. Por favor, escolha outro nome.';
                } else {
                    errorMessage = errorJson.message || errorJson.error?.message || JSON.stringify(errorJson);
                }
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

export async function createInstance(
    instanceName: string,
    baseUrl?: string,
    token?: string,
    chatwoot?: {
        accountId?: string;
        token?: string;
        url?: string;
        signMsg?: boolean;
        reopenConversation?: boolean;
        conversationPending?: boolean;
        importContacts?: boolean;
        nameInbox?: string;
        mergeBrazilContacts?: boolean;
        importMessages?: boolean;
        daysLimitImportMessages?: number;
        organization?: string;
        logo?: string;
        signDelimiter?: string;
        autoCreate?: boolean;
        ignoreJids?: string;
    }
) {
    try {
        const trimmedName = instanceName.trim().replace(/\s+/g, '_');
        const body: any = {
            instanceName: trimmedName,
            token: token || '',
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
        };

        if (chatwoot && chatwoot.url && chatwoot.token && chatwoot.accountId) {
            body.chatwootAccountId = chatwoot.accountId;
            body.chatwootToken = chatwoot.token;
            body.chatwootUrl = chatwoot.url;
            body.chatwootSignMsg = chatwoot.signMsg ?? true;
            body.chatwootSignDelimiter = chatwoot.signDelimiter || '\n';
            body.chatwootReopenConversation = chatwoot.reopenConversation ?? true;
            body.chatwootConversationPending = chatwoot.conversationPending ?? false;
            body.chatwootImportContacts = chatwoot.importContacts ?? true;
            body.chatwootNameInbox = chatwoot.nameInbox || 'evolution';
            body.chatwootMergeBrazilContacts = chatwoot.mergeBrazilContacts ?? true;
            body.chatwootImportMessages = chatwoot.importMessages ?? true;
            body.chatwootDaysLimitImportMessages = chatwoot.daysLimitImportMessages ?? 3;
            body.chatwootOrganization = chatwoot.organization || 'Evolution Bot';
            body.chatwootLogo = chatwoot.logo || '';
            body.chatwootAutoCreate = chatwoot.autoCreate ?? true;
            body.chatwootIgnoreJids = chatwoot.ignoreJids || '';
        }

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

export async function deleteInstanceFromServer(instanceName: string, baseUrl?: string, token?: string) {
    try {
        await fetchEvolution(`/instance/delete/${instanceName.trim()}`, 'DELETE', undefined, baseUrl, token);
        return true;
    } catch (error) {
        console.error('Error deleting instance from server:', error);
        return false; // Don't block local deletion if remote fails
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

        return status;
    } catch (error) {
        console.error('Error syncing instance data:', error);
        return 'Disconnected';
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

export async function createUserInstance(instanceName: string, redeId: string, ownerId: string, inboxName?: string) {
    try {
        const { getRedeById } = await import('./db');
        const rede = await getRedeById(redeId);

        if (!rede || !rede.whatsapp_enabled) {
            return { success: false, error: 'Criação de instância não habilitada para sua rede.' };
        }

        if (!rede.whatsapp_api_url || !rede.whatsapp_api_token) {
            return { success: false, error: 'Configuração de API pendente. Contate o suporte.' };
        }

        // Merge custom inbox name if provided
        const chatwootConfig = {
            ...(rede.whatsapp_chatwoot_config || {}),
            nameInbox: inboxName || rede.whatsapp_chatwoot_config?.nameInbox || instanceName
        };

        // Create in Evolution API
        await createInstance(
            instanceName,
            rede.whatsapp_api_url,
            rede.whatsapp_api_token,
            chatwootConfig
        );

        // Save to local database
        const saved = await saveWhatsAppInstance({
            instanceName,
            redeId,
            ownerId,
            apiUrl: rede.whatsapp_api_url,
            instanceToken: rede.whatsapp_api_token,
            status: 'close'
        });

        revalidatePath('/whatsapp');
        return { success: true, data: saved };
    } catch (error: any) {
        console.error('Error in createUserInstance:', error);
        return { success: false, error: error.message || 'Erro desconhecido ao criar instância' };
    }
}

export async function setChatwoot(
    instanceName: string,
    config: {
        accountId: string;
        token: string;
        url: string;
        signMsg?: boolean;
        reopenConversation?: boolean;
        conversationPending?: boolean;
        importContacts?: boolean;
        nameInbox?: string;
        mergeBrazilContacts?: boolean;
        importMessages?: boolean;
        daysLimitImportMessages?: number;
        organization?: string;
        logo?: string;
        signDelimiter?: string;
        autoCreate?: boolean;
        ignoreJids?: string;
    },
    baseUrl?: string,
    token?: string
) {
    try {
        const body = {
            enabled: true,
            accountId: config.accountId,
            token: config.token,
            url: config.url,
            signMsg: config.signMsg ?? true,
            signDelimiter: config.signDelimiter || '\n',
            reopenConversation: config.reopenConversation ?? true,
            conversationPending: config.conversationPending ?? false,
            importContacts: config.importContacts ?? true,
            nameInbox: config.nameInbox || 'evolution',
            mergeBrazilContacts: config.mergeBrazilContacts ?? true,
            importMessages: config.importMessages ?? true,
            daysLimitImportMessages: config.daysLimitImportMessages ?? 3,
            organization: config.organization || 'Evolution Bot',
            logo: config.logo || '',
            autoCreate: config.autoCreate ?? true,
            ignoreJids: config.ignoreJids || ''
        };
        return await fetchEvolution(`/chatwoot/set/${instanceName.trim()}`, 'POST', body, baseUrl, token);
    } catch (error) {
        console.error('Error setting Chatwoot:', error);
        throw error;
    }
}
