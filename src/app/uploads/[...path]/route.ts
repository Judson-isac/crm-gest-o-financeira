import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    context: { params: { path: string[] } } // Correct type for App Router params
) {
    // Await params if needed (in Next 15+ params are async, but usually object in 14)
    // To be safe with recent versions:
    const { path } = context.params;

    if (!path || path.length === 0) {
        return new NextResponse('Bad Request', { status: 400 });
    }

    try {
        // Construct the full path securely
        const uploadsRoot = join(process.cwd(), 'public', 'uploads');
        const filePath = join(uploadsRoot, ...path);

        // Security check: ensure path is within uploads
        if (!filePath.startsWith(uploadsRoot)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        try {
            await stat(filePath);
        } catch {
            console.error(`File not found: ${filePath}`);
            return new NextResponse('File not found', { status: 404 });
        }

        const fileBuffer = await readFile(filePath);

        // Determine mime type manually to avoid dependencies
        const ext = filePath.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';

        const mimeMap: Record<string, string> = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'csv': 'text/csv'
        };

        if (ext && mimeMap[ext]) {
            contentType = mimeMap[ext];
        }

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

    } catch (error) {
        console.error('Error serving file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
