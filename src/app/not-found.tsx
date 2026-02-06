export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function NotFound() {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>404 - Página não encontrada</h1>
            <p>A página que você procura não existe.</p>
            <a href="/">Voltar para a página inicial</a>
        </div>
    );
}
