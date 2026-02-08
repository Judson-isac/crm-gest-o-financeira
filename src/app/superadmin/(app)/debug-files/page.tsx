import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export default async function DebugFilesPage() {
    const cwd = process.cwd();
    const uploadsPath = join(cwd, 'public', 'uploads', 'matriculas');

    let files: string[] = [];
    let error = null;
    let pathExists = false;

    try {
        await stat(uploadsPath);
        pathExists = true;
        files = await readdir(uploadsPath);
    } catch (e: any) {
        error = e.message;
    }

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-2xl font-bold mb-4">Debug de Arquivos</h1>

            <div className="mb-6 p-4 bg-gray-100 rounded">
                <p><strong>Process CWD:</strong> {cwd}</p>
                <p><strong>Target Path:</strong> {uploadsPath}</p>
                <p><strong>Path Exists:</strong> {pathExists ? 'YES' : 'NO'}</p>
            </div>

            {error && (
                <div className="p-4 bg-red-100 text-red-700 mb-6 rounded">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <h2 className="text-xl font-bold mb-2">Arquivos Encontrados ({files.length}):</h2>
            {files.length > 0 ? (
                <ul className="list-disc pl-5">
                    {files.map(f => (
                        <li key={f}>
                            <a href={`/uploads/matriculas/${f}`} target="_blank" className="text-blue-600 hover:underline">
                                {f}
                            </a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500">Nenhum arquivo encontrado.</p>
            )}
        </div>
    );
}
