
"use server";

import { z } from "zod";
import { format } from 'date-fns';
import iconv from 'iconv-lite';

const AuthSchema = z.object({
    login: z.string().min(1, "O login é obrigatório."),
    senha: z.string().min(1, "A senha é obrigatória."),
});


type AuthState = {
    success: boolean;
    cookie?: string;
    error?: string;
};

type RepasseOptionsState = {
    success: boolean;
    options?: { value: string; label: string }[];
    error?: string;
    rawBody?: string;
    amfBodyString?: string;
};


function getSetCookie(headers: Headers): string[] {
    // @ts-ignore - getSetCookie não está em todas as definições de tipo, mas funciona no Next.js edge/node
    if (typeof headers.getSetCookie === 'function') {
        // @ts-ignore
        return headers.getSetCookie();
    }

    const cookie = headers.get("set-cookie");
    return cookie ? cookie.split(',').map(c => c.trim()) : [];
}

export async function authenticateAndGetCookie(
    prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const validatedFields = AuthSchema.safeParse({
        login: formData.get("login"),
        senha: formData.get("senha"),
    });

    if (!validatedFields.success) {
        return { success: false, error: validatedFields.error.errors.map(e => e.message).join(', ') };
    }

    const { login, senha } = validatedFields.data;

    const firstRequestBody = new URLSearchParams();
    firstRequestBody.append("login", login);
    firstRequestBody.append("senha", senha);
    firstRequestBody.append("Token", "22021cd98eaccdc4a2e8fffbb6d7cd37");
    firstRequestBody.append("action", "ValidaEmail");

    let firstRequestCookies: string[];

    try {
        const firstResponse = await fetch("http://sistemasead.unicesumar.edu.br/portal/api/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: firstRequestBody.toString(),
        });

        if (!firstResponse.ok) {
            return { success: false, error: `Falha na Etapa 1 de autenticação com status: ${firstResponse.status}` };
        }

        firstRequestCookies = getSetCookie(firstResponse.headers);

        if (firstRequestCookies.length === 0) {
            return { success: false, error: "Cookie não encontrado na resposta da Etapa 1." };
        }

    } catch (e: any) {
        return { success: false, error: `Falha na Etapa 1 de autenticação: ${e.message || "Ocorreu um erro desconhecido."}` };
    }

    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const secondRequestUrl = `http://sistemasead.unicesumar.edu.br/portal/index.php?time=${timestamp}`;

    const secondRequestBody = new URLSearchParams();
    secondRequestBody.append("login", login);
    secondRequestBody.append("senha", senha);

    const secondRequestHeaders = new Headers({
        'Host': 'sistemasead.unicesumar.edu.br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Portal App: 1.2.0 (Windows 10.0.26100; x64)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Referer': `http://sistemasead.unicesumar.edu.br/portal/index.php?time=${timestamp}`,
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'pt-BR',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': firstRequestCookies.map(c => c.split(';')[0]).join('; ')
    });

    try {
        const secondResponse = await fetch(secondRequestUrl, {
            method: "POST",
            headers: secondRequestHeaders,
            body: secondRequestBody.toString(),
            redirect: 'manual'
        });

        if (secondResponse.status !== 302) {
            const errorBody = await secondResponse.text();
            console.error("Authentication Step 2 Unexpected Response:", errorBody);
            return { success: false, error: `Falha na Etapa 2 de autenticação. Status recebido: ${secondResponse.status}. Esperava 302.` };
        }

        const finalCookies = getSetCookie(secondResponse.headers);
        const combinedCookies = [...firstRequestCookies, ...finalCookies];
        const uniqueCookies = [...new Map(combinedCookies.map(c => [c.split('=')[0].trim(), c])).values()];
        const finalCookieString = uniqueCookies.map(c => c.split(';')[0]).join('; ');

        if (!finalCookieString) {
            return { success: false, error: "Cookie final não encontrado na resposta da Etapa 2." };
        }

        return { success: true, cookie: finalCookieString };

    } catch (e: any) {
        return { success: false, error: `Falha na Etapa 2 de autenticação: ${e.message || "Ocorreu um erro desconhecido."}` };
    }
}


function readU29(hexString: string, cursor: { pos: number }): number {
    let result = 0;
    let byteCount = 0;

    while (byteCount < 4) {
        const byteHex = hexString.substring(cursor.pos, cursor.pos + 2);
        cursor.pos += 2;
        const byte = parseInt(byteHex, 16);
        byteCount++;

        if (byteCount < 4) {
            if ((byte & 0x80) !== 0) {
                result = (result << 7) | (byte & 0x7F);
            } else {
                result = (result << 7) | byte;
                break;
            }
        } else {
            result = (result << 8) | byte;
            break;
        }
    }
    return result;
}


function parseRepasseOptions(hexString: string): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    const recordMarker = "0a0b01";
    let currentIndex = hexString.indexOf(recordMarker);

    while (currentIndex !== -1) {
        const cursor = { pos: currentIndex + recordMarker.length };

        // Procurar o marcador de inteiro '04' para o value
        const intMarkerIndex = hexString.indexOf('04', cursor.pos);
        if (intMarkerIndex === -1 || intMarkerIndex > cursor.pos + 10) { // Limita a busca para evitar pular registros
            currentIndex = hexString.indexOf(recordMarker, cursor.pos);
            continue;
        }
        cursor.pos = intMarkerIndex + 2;

        try {
            const value = readU29(hexString, cursor);

            // Procurar o marcador de string '06' para o label
            const stringMarkerIndex = hexString.indexOf('06', cursor.pos);
            if (stringMarkerIndex === -1 || stringMarkerIndex > cursor.pos + 10) {
                currentIndex = hexString.indexOf(recordMarker, cursor.pos);
                continue;
            }
            cursor.pos = stringMarkerIndex + 2;

            const labelLength = readU29(hexString, cursor) >> 1; // O comprimento da string também é um U29, remove o bit de referência

            const labelHex = hexString.substring(cursor.pos, cursor.pos + (labelLength * 2));
            const labelBuffer = Buffer.from(labelHex, 'hex');
            const label = iconv.decode(labelBuffer, 'win1252');

            options.push({
                value: String(value),
                label: label.trim(),
            });

            cursor.pos += labelLength * 2;
        } catch (e) {
            console.error("Error parsing a record, skipping:", e);
        }

        currentIndex = hexString.indexOf(recordMarker, cursor.pos);
    }

    return options;
}

export async function fetchRepasseOptions(
    { cookie }: { cookie: string }
): Promise<RepasseOptionsState> {
    const url = "http://sistemasead.unicesumar.edu.br/flex/amfphp/gateway.php";

    const amfBody = Buffer.from([
        0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x04, 0x6e, 0x75, 0x6c, 0x6c, 0x00, 0x02, 0x2f, 0x35,
        0x00, 0x00, 0x01, 0x21, 0x0a, 0x00, 0x00, 0x00, 0x01, 0x11, 0x0a, 0x81, 0x13, 0x4f, 0x66, 0x6c,
        0x65, 0x78, 0x2e, 0x6d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x69, 0x6e, 0x67, 0x2e, 0x6d, 0x65, 0x73,
        0x73, 0x61, 0x67, 0x65, 0x73, 0x2e, 0x52, 0x65, 0x6d, 0x6f, 0x74, 0x69, 0x6e, 0x67, 0x4d, 0x65,
        0x73, 0x73, 0x61, 0x67, 0x65, 0x13, 0x6f, 0x70, 0x65, 0x72, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x0d,
        0x73, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x13, 0x74, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70,
        0x15, 0x74, 0x69, 0x6d, 0x65, 0x54, 0x6f, 0x4c, 0x69, 0x76, 0x65, 0x11, 0x63, 0x6c, 0x69, 0x65,
        0x6e, 0x74, 0x49, 0x64, 0x0f, 0x68, 0x65, 0x61, 0x64, 0x65, 0x72, 0x73, 0x17, 0x64, 0x65, 0x73,
        0x74, 0x69, 0x6e, 0x61, 0x74, 0x69, 0x6f, 0x6e, 0x09, 0x62, 0x6f, 0x64, 0x79, 0x13, 0x6d, 0x65,
        0x73, 0x73, 0x61, 0x67, 0x65, 0x49, 0x64, 0x06, 0x19, 0x4c, 0x69, 0x73, 0x74, 0x61, 0x52, 0x65,
        0x70, 0x61, 0x73, 0x73, 0x65, 0x06, 0x19, 0x50, 0x6f, 0x72, 0x74, 0x61, 0x6c, 0x2e, 0x4c, 0x69,
        0x73, 0x74, 0x61, 0x04, 0x00, 0x04, 0x00, 0x06, 0x49, 0x36, 0x32, 0x35, 0x43, 0x34, 0x45, 0x37,
        0x31, 0x2d, 0x41, 0x31, 0x39, 0x45, 0x2d, 0x42, 0x36, 0x38, 0x38, 0x2d, 0x39, 0x32, 0x34, 0x31,
        0x2d, 0x30, 0x30, 0x30, 0x30, 0x34, 0x36, 0x31, 0x46, 0x42, 0x34, 0x38, 0x31, 0x0a, 0x0b, 0x01,
        0x09, 0x44, 0x53, 0x49, 0x64, 0x06, 0x07, 0x6e, 0x69, 0x6c, 0x15, 0x44, 0x53, 0x45, 0x6e, 0x64,
        0x70, 0x6f, 0x69, 0x6e, 0x74, 0x06, 0x13, 0x6d, 0x79, 0x2d, 0x61, 0x6d, 0x66, 0x70, 0x68, 0x70,
        0x01, 0x06, 0x0d, 0x61, 0x6d, 0x66, 0x70, 0x68, 0x70, 0x09, 0x03, 0x01, 0x0a, 0x05, 0x01, 0x06,
        0x49, 0x43, 0x41, 0x43, 0x39, 0x42, 0x42, 0x42, 0x39, 0x2d, 0x30, 0x46, 0x46, 0x34, 0x2d, 0x37,
        0x33, 0x45, 0x44, 0x2d, 0x45, 0x31, 0x37, 0x37, 0x2d, 0x35, 0x42, 0x35, 0x39, 0x39, 0x44, 0x37,
        0x35, 0x30, 0x33, 0x39, 0x41
    ]);

    const headers = {
        'Cookie': cookie,
        'Content-Type': 'application/x-amf',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PortalNEAD/1.2.0 Chrome/87.0.4280.141 Electron/11.4.10 Safari/537.36',
        'Accept': '*/*',
        'Origin': 'http://sistemasead.unicesumar.edu.br',
        'X-Requested-With': 'ShockwaveFlash/31.0.0.153',
        'Referer': 'http://sistemasead.unicesumar.edu.br/portal/relatorio/index.swf',
        'Accept-Language': 'pt-BR',
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: amfBody
        });

        const buffer = await response.arrayBuffer();
        const rawBody = Buffer.from(buffer).toString('hex');
        const amfBodyString = amfBody.toString('hex');

        if (!response.ok) {
            return { success: false, error: `Erro na requisição AMF: ${response.status}`, rawBody, amfBodyString };
        }

        try {
            const options = parseRepasseOptions(rawBody);

            if (!options || options.length === 0) {
                return { success: false, error: "A resposta AMF foi recebida, mas nenhuma opção de repasse foi encontrada após o parsing.", rawBody, amfBodyString };
            }

            return { success: true, options, rawBody, amfBodyString };

        } catch (parseError: any) {
            return { success: false, error: `Falha ao processar a resposta AMF: ${parseError.message}`, rawBody, amfBodyString };
        }

    } catch (e: any) {
        console.error("Erro na Action fetchRepasseOptions:", e);
        return { success: false, error: `Falha ao buscar opções de repasse: ${e.message}`, amfBodyString: amfBody.toString('hex') };
    }
}

type CursosResponse = {
    success: boolean;
    data?: any;
    error?: string;
}

export async function fetchCursosJson(): Promise<CursosResponse> {
    const url = "https://inscricoes.unicesumar.edu.br/assets/images/features/dashboard/cursos.json";
    const headers = new Headers({
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Referer": "https://inscricoes.unicesumar.edu.br/graduacao/",
        "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "\"Android\"",
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "x-dtpc": "24$17765306_717h6vAAAKDHHNVSNHPNATFONCKMLHCQKEADHK-0e0",
    });

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `A requisição falhou com o status: ${response.status}. Resposta: ${errorText}` };
        }

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            return { success: true, data };
        } catch (parseError: any) {
            console.error("Falha ao analisar JSON de cursos:", parseError.message);
            console.error("Início da resposta recebida:", text.substring(0, 500));
            return { success: false, error: `A resposta da Sede não é um JSON válido. Verifique se o site deles está acessível. Detalhe: ${parseError.message}` };
        }

    } catch (e: any) {
        console.error("Erro na Action fetchCursosJson:", e);
        return { success: false, error: e.message || "Ocorreu um erro desconhecido." };
    }
}
