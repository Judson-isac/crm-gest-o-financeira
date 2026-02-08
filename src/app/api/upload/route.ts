
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ success: true, files: [] });
        }

        const uploadedPaths: string[] = [];

        for (const file of files) {
            if (file.size === 0) continue;

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const timestamp = Date.now();
            const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filename = `${timestamp}-${originalName}`;

            // Save to public/uploads/matriculas
            const filepath = join(process.cwd(), 'public', 'uploads', 'matriculas', filename);

            await mkdir(dirname(filepath), { recursive: true });
            await writeFile(filepath, buffer);

            uploadedPaths.push(`/uploads/matriculas/${filename}`);
        }

        return NextResponse.json({ success: true, files: uploadedPaths });
    } catch (error: any) {
        console.error('Error uploading files:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Error processing upload' },
            { status: 500 }
        );
    }
}
