import { purge } from '../src/cmdPurge';
import * as fsPromises from 'fs/promises';
import { Dirent, PathLike } from 'fs';
import fs from 'fs';
import { log } from 'console';
import * as readline from 'readline/promises';

vi.mock('readline/promises', () => ({
    createInterface: vi.fn(),
}));

vi.mock('fs/promises');
vi.mock('console', () => ({
    log: vi.fn(),
}));

const createMockDirent = (name: string, isDirectory: boolean): Dirent => {
    const dirent = new fs.Dirent();
    dirent.name = name;
    dirent.parentPath = 'path';
    dirent.isDirectory = () => isDirectory;
    dirent.isFile = () => !isDirectory;
    return dirent;
};

beforeEach(() => {
    vi.clearAllMocks();
    globalThis.program = { error: vi.fn(), version: () => "1.0.0" } as any;
});

test('Purge - positive test (finds and deletes node_modules)', async () => {
    // Mock readdir to simulate structure: [ 'my-project' ] -> [ 'node_modules', 'index.ts' ]
    vi.spyOn(fsPromises, 'readdir').mockImplementation(async (
        path: PathLike,
        options: { withFileTypes: boolean } | undefined
    ): Promise<any> => {
        if (typeof path !== "string") {
            return [];
        }
        const withFileTypes = typeof options === 'object' && options?.withFileTypes;
        switch (path) {
            case "test-target": {
                return ['my-project'];
            }
            case "test-target/my-project": {
                return ['node_modules', 'index.ts'];
            }
            case "test-target/my-project/node_modules": {
                if (withFileTypes) {
                    return [createMockDirent('file1.ts', false), createMockDirent('folder', true)];
                }
                return ['file1.ts', 'folder'];
            }
            case "test-target/my-project/node_modules/folder": {
                if (withFileTypes) {
                    return [createMockDirent('file2.ts', false)];
                }
                return ['file2.ts'];
            }
        }
    });

    vi.spyOn(fsPromises, 'rm').mockResolvedValue(undefined);
    vi.spyOn(fsPromises, 'stat').mockImplementation(async (path: PathLike): Promise<any> => {
        if (typeof path !== "string") {
            return { isDirectory: () => false, size: 0, isFile: () => false };
        }
        if (path.endsWith('package.json')) {
            return { isDirectory: () => false, size: 1024, isFile: () => true };
        }
        const isDir = !path.endsWith('.ts');
        return {
            isDirectory: () => isDir,
            size: 1024,
            isFile: () => !isDir
        };
    });

    await purge(['test-target'], { quiet: true, dry: false, force: true });

    // Assert that 'test-target/my-project/node_modules' was targeted for removal
    expect(fsPromises.rm).toHaveBeenCalledWith('test-target/my-project/node_modules', { recursive: true, force: true });
});

test('Purge - non-quiet and dry run modes', async () => {
    vi.spyOn(fsPromises, 'readdir').mockResolvedValue([]);
    vi.spyOn(fsPromises, 'rm').mockResolvedValue(undefined);

    await purge(['.'], { quiet: false, dry: true, force: false });

    expect(fsPromises.rm).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
});

test('Purge - get directory size logic', async () => {
    vi.spyOn(fsPromises, 'readdir').mockImplementation(async (
        path: PathLike,
        options: { withFileTypes: boolean } | undefined
    ): Promise<any> => {
        switch (path) {
            case "test-target": {
                return ['my-project'];
            }
            case "test-target/my-project": {
                return ['node_modules', 'package.json'];
            }
            case "test-target/my-project/node_modules": {
                if (options?.withFileTypes) {
                    return [createMockDirent('file1.ts', false), createMockDirent('folder', true)];
                }
                return ['file1.ts', 'folder'];
            }
            case "test-target/my-project/node_modules/folder": {
                if (options?.withFileTypes) {
                    return [createMockDirent('file2.ts', false)];
                }
                return ['file2.ts'];
            }
            default: {
                return [];
            }
        }
    });

    vi.spyOn(fsPromises, 'stat').mockImplementation(async (path: PathLike): Promise<any> => {
        if (typeof path !== "string") return { isDirectory: () => false, size: 0, isFile: () => false };
        if (path.endsWith('package.json')) return { isDirectory: () => false, size: 1024, isFile: () => true };
        const isDir = !path.endsWith('.ts');
        return {
            isDirectory: () => isDir,
            size: 2048,
            isFile: () => !isDir
        };
    });

    vi.spyOn(fsPromises, 'rm').mockResolvedValue(undefined);

    await purge(['test-target'], { quiet: false, dry: false, force: true });

    expect(fsPromises.rm).toHaveBeenCalledWith('test-target/my-project/node_modules', { recursive: true, force: true });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Successfully purged all node_modules! Saved')); // TODO: Replace this with a dedicated environment message or something
});

test('Purge - error handling during stat for package.json', async () => {
    vi.spyOn(fsPromises, 'readdir').mockImplementation(async (path: PathLike): Promise<any> => {
        switch (path) {
            case "test-target": {
                return ['my-project'];
            }
            case "test-target/my-project": {
                return ['node_modules'];
            }
            default: {
                return [];
            }
        }
    });

    vi.spyOn(fsPromises, 'stat').mockImplementation(async (path: PathLike): Promise<any> => {
        if (typeof path !== "string") return { isDirectory: () => false, size: 0, isFile: () => false };
        if (path.endsWith('package.json')) throw new Error('Permission denied');
        const isDir = !path.endsWith('.ts');
        return {
            isDirectory: () => isDir,
            size: 1024,
            isFile: () => !isDir
        };
    });

    vi.spyOn(fsPromises, 'rm').mockResolvedValue(undefined);

    await purge(['test-target'], { quiet: true, dry: false, force: true });

    expect(fsPromises.rm).not.toHaveBeenCalled();
});

test('Purge - error handling during stat for normal folder', async () => {
    vi.spyOn(fsPromises, 'readdir').mockImplementation(async (path: PathLike): Promise<any> => {
        if (path === 'test-target') return ['my-project'];
        return [];
    });
    vi.spyOn(fsPromises, 'stat').mockRejectedValue(new Error('Permission denied for folder'));

    await purge(['test-target'], { quiet: true, dry: false, force: true });

    expect(fsPromises.rm).not.toHaveBeenCalled();
});

test('Purge - negative test (shows error when no destinations are provided)', async () => {
    const errorMock = vi.fn();
    globalThis.program = { error: errorMock, version: () => "1.0.0" } as any;

    await purge([], { quiet: true });

    // Assert that the program threw an error instead of proceeding
    expect(errorMock).toHaveBeenCalledWith('No destinations provided. Please specify at least one directory to purge Node.js modules.'); // TODO: Replace this with a dedicated environment message or something
});

test('Purge - recursive getDirectorySize logic', async () => {
    vi.spyOn(fsPromises, 'readdir').mockImplementation(async (
        path: PathLike,
        options: any
    ): Promise<any> => {
        if (path === 'test-target') return ['my-project'];
        if (path === 'test-target/my-project') return ['node_modules', 'package.json'];
        if (path === 'test-target/my-project/node_modules') {
            if (options?.withFileTypes) {
                // Return a subfolder and a file to test recursion and file sizes
                return [createMockDirent('folder1', true), createMockDirent('file1.ts', false), createMockDirent('broken-symlink.txt', false)];
            }
            return ['folder1', 'file1.ts', 'broken-symlink.txt'];
        }
        if (path === 'test-target/my-project/node_modules/folder1') {
            if (options?.withFileTypes) {
                return [createMockDirent('file2.ts', false)];
            }
            return ['file2.ts'];
        }
        return [];
    });

    vi.spyOn(fsPromises, 'stat').mockImplementation(async (path: PathLike): Promise<any> => {
        if (typeof path !== "string") return { isDirectory: () => false, size: 0, isFile: () => false };
        if (path.endsWith('package.json')) return { isDirectory: () => false, size: 1024, isFile: () => true };
        if (path.endsWith('broken-symlink.txt')) throw new Error('Broken symlink');
        const isDir = !path.endsWith('.ts');
        return {
            isDirectory: () => isDir,
            size: 2048,
            isFile: () => !isDir
        };
    });

    vi.spyOn(fsPromises, 'rm').mockResolvedValue(undefined);

    await purge(['test-target'], { quiet: false, dry: false, force: true });

    expect(fsPromises.rm).toHaveBeenCalledWith('test-target/my-project/node_modules', { recursive: true, force: true });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Successfully purged all node_modules! Saved')); // TODO: Replace this with a dedicated environment message or something
});

test('Purge - top level confirmation (confirmed)', async () => {
    const questionMock = vi.fn().mockResolvedValue('y');
    const closeMock = vi.fn();
    vi.mocked(readline.createInterface).mockReturnValue({
        question: questionMock,
        close: closeMock
    } as any);

    vi.spyOn(fsPromises, 'readdir').mockResolvedValue([]);
    const errorMock = vi.fn();
    globalThis.program = { error: errorMock, version: () => "1.0.0" } as any;

    await purge(['/'], { quiet: true, dry: true, force: false });

    // Assert that readline asked and finished without error
    expect(readline.createInterface).toHaveBeenCalled();
    expect(questionMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();
});

test('Purge - top level confirmation (cancelled)', async () => {
    const questionMock = vi.fn().mockResolvedValue('n');
    const closeMock = vi.fn();
    vi.mocked(readline.createInterface).mockReturnValue({
        question: questionMock,
        close: closeMock
    } as any);

    const errorMock = vi.fn();
    globalThis.program = { error: errorMock, version: () => "1.0.0" } as any;

    await purge(['/'], { quiet: true, dry: true, force: false });

    // Assert that the CLI aborted
    expect(errorMock).toHaveBeenCalledWith('Operation cancelled by user.');
});

test('Purge - purge on non-existent path', async () => {
    const errorMessage = "ENOENT: no such file or directory, scandir 'foofoofoo'"
    vi.spyOn(fsPromises, 'readdir').mockRejectedValue(new Error(errorMessage));
    const errorMock = vi.fn();
    globalThis.program = { error: errorMock, version: () => "1.0.0" } as any;

    await purge(["foofoofoo"], { quiet: true });

    // Assert that the program threw an error instead of proceeding
    expect(errorMock).toHaveBeenCalledWith("Something went wrong while traversing files. Please be sure that the given path is valid and not protected. Error Message: " + errorMessage);
})