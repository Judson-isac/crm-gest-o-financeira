
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cookie, repasse, parceiro } = await request.json();

    if (!cookie || !repasse) {
      return NextResponse.json({ success: false, error: "Cookie e Repasse são obrigatórios." }, { status: 400 });
    }

    const url = "http://sistemasead.unicesumar.edu.br/portal/relatorio/REL_REPASSE_POLO_LISTA_ALUNOS.php";
    
    const requestHeaders = new Headers({
        'Host': 'sistemasead.unicesumar.edu.br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) PortalNEAD/1.2.0 Chrome/87.0.4280.141 Electron/11.4.10 Safari/537.36',
        'Origin': 'http://sistemasead.unicesumar.edu.br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Referer': 'http://sistemasead.unicesumar.edu.br/portal/relatorio/',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'pt-BR',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
    });

    const body = new URLSearchParams();
    body.append('repasse', repasse);
    body.append('tipo_impressão', 'html'); 
    body.append('parceiro', parceiro || '');

    const fetchOptions: RequestInit = {
      method: "POST",
      headers: requestHeaders,
      body: body.toString(),
      cache: 'no-store',
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        const errorText = await response.text();
        console.error("NEAD Fetch Error:", errorText);
        return NextResponse.json({ success: false, error: `A requisição ao NEAD falhou com o status: ${response.status} ${response.statusText}` }, { status: response.status });
    }

    // We get the raw buffer and decode it using 'latin1' (windows-1252) to preserve special characters
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('windows-1252');
    const responseBody = decoder.decode(buffer);
    
    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (e: any) {
    console.error("Erro na API fetch-report:", e);
    return NextResponse.json({ success: false, error: e.message || "Ocorreu um erro desconhecido no servidor." }, { status: 500 });
  }
}
