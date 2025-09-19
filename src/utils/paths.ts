import path from 'path';
import { app } from 'electron';

/**
 * 获取 sandbox_images 目录的跨平台路径
 * 支持开发环境和生产环境，适用于 macOS、Windows、Linux
 */
export function getSandboxImagesPath(): string {
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：从项目根目录获取
    return path.join(process.cwd(), 'sandbox_images');
  }

  // 生产环境：从应用资源目录获取
  // process.resourcesPath 在所有平台都可用
  return path.join(process.resourcesPath, 'sandbox_images');
}

/**
 * 获取指定 Docker 镜像文件的完整路径
 * @param filename 镜像文件名，如 'e2b-sandbox-latest.tar.gz'
 */
export function getDockerImagePath(filename: string): string {
  return path.join(getSandboxImagesPath(), filename);
}

/**
 * 检查 sandbox_images 目录是否存在
 */
export async function checkSandboxImagesExists(): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const imagesPath = getSandboxImagesPath();
    await fs.access(imagesPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取 sandbox_images 目录下的所有镜像文件
 */
export async function listDockerImages(): Promise<string[]> {
  try {
    const fs = await import('fs/promises');
    const imagesPath = getSandboxImagesPath();
    const files = await fs.readdir(imagesPath);

    // 过滤出 Docker 镜像文件
    return files.filter(file =>
      file.endsWith('.tar.gz') ||
      file.endsWith('.gz') ||
      file.endsWith('.tar')
    );
  } catch {
    return [];
  }
}